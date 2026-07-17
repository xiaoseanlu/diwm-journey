import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { StatusPillBestOutcome } from "./StatusPillBestOutcome";
import "./expert-match-animation.css";

export type ExpertMatchPhase = "inChat" | "reassurance" | "benResult";

const SKILL_TICKER = [
  "W-2 income…",
  "RSU",
  "Rental",
  "Investments",
  "Multi-state",
  "WA taxes",
] as const;

const EXPERT_FACES = [
  { src: "experts/Cindy.png", alt: "Cindy" },
  { src: "experts/Sergio.png", alt: "Sergio" },
  { src: "experts/Amir.png", alt: "Amir" },
] as const;

const IN_CHAT_MS = 6000;
const REASSURANCE_MS = 4200;
const RIPPLE_DURATION_MS = 6800;
/** Three rings from the face edge — gentle stagger, trailing outward. */
const RIPPLE_STAGGERS_S = [0, 0.9, 1.8] as const;
const CYCLE_TRANSITION_MS = 220;
/** Skill labels cycle this many times per face swap. */
const TICKER_RATE = 2;
const PULSE_CLEANUP_MS = RIPPLE_DURATION_MS + RIPPLE_STAGGERS_S[2] * 1000 + 400;

const RIPPLE_BASE_RADIUS_PX = 48;

type Pulse = { id: number };

function renderRipplePulses(pulses: Pulse[]) {
  return (
    <div className="expert-match-card__ripples" aria-hidden>
      {pulses.map(({ id }) => (
        <div key={id} className="expert-match-card__pulse">
          {RIPPLE_STAGGERS_S.map((staggerS, i) => (
            <span
              key={i}
              className="expert-match-card__ripple"
              style={{ animationDelay: `${staggerS}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function rippleStageStyle(rippleScaleEnd: number): React.CSSProperties {
  return {
    "--expert-pulse-duration": `${RIPPLE_DURATION_MS}ms`,
    "--ripple-scale-end": rippleScaleEnd,
  } as React.CSSProperties;
}

/** Scale so ripples expand past the card clip — exit off-screen, not stop at the edge. */
function measureRippleScaleEnd(card: HTMLElement): number {
  const faceWrap = card.querySelector<HTMLElement>(
    ".expert-match-card__face-wrap, .expert-anim__ripple-origin",
  );
  if (!faceWrap) return 5.5;

  const cardRect = card.getBoundingClientRect();
  const faceRect = faceWrap.getBoundingClientRect();
  const cx = faceRect.left + faceRect.width / 2 - cardRect.left;
  const cy = faceRect.top + faceRect.height / 2 - cardRect.top;
  const toFarthestCorner = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(cardRect.width - cx, cy),
    Math.hypot(cx, cardRect.height - cy),
    Math.hypot(cardRect.width - cx, cardRect.height - cy),
  );
  return Math.max(3.5, (toFarthestCorner / RIPPLE_BASE_RADIUS_PX) * 1.12);
}

/**
 * When the lead ripple clears the card clip (still animating invisibly beyond).
 * Face swap uses this — not the full ripple animation duration.
 */
function measureFaceSwapMs(card: HTMLElement, scaleEnd: number): number {
  const faceWrap = card.querySelector<HTMLElement>(
    ".expert-match-card__face-wrap, .expert-anim__ripple-origin",
  );
  if (!faceWrap) return Math.round(RIPPLE_DURATION_MS * 0.55);

  const cardRect = card.getBoundingClientRect();
  const faceRect = faceWrap.getBoundingClientRect();
  const cx = faceRect.left + faceRect.width / 2 - cardRect.left;
  const cy = faceRect.top + faceRect.height / 2 - cardRect.top;
  const toNearestEdge = Math.min(cx, cardRect.width - cx, cy, cardRect.height - cy);
  const clipExitScale = toNearestEdge / RIPPLE_BASE_RADIUS_PX;
  const linearFraction = (clipExitScale - 1) / (scaleEnd - 1);
  // Match cubic-bezier(0.22, 0.55, 0.24, 1) — ring reaches clip edge before animation ends
  const easedFraction = Math.pow(Math.min(1, Math.max(0, linearFraction)), 0.65);
  return Math.round(
    Math.min(RIPPLE_DURATION_MS * 0.72, Math.max(RIPPLE_DURATION_MS * 0.4, RIPPLE_DURATION_MS * easedFraction)),
  );
}

export type ExpertMatchAnimationProps = {
  onDone: () => void;
  onPhaseChange?: (phase: ExpertMatchPhase) => void;
  /** Anchor for locating `.diwm-device-frame` (fullscreen portal + bleed). */
  screenRef: RefObject<HTMLElement | null>;
};

function getDeviceFrame(el: HTMLElement | null): HTMLElement | null {
  return el?.closest(".diwm-device-frame") ?? null;
}

/**
 * Expert match sequence (share-docs stage 24):
 * in-chat blue card → full-screen reassurance → Ben reveal.
 */
export function ExpertMatchAnimation({
  onDone,
  onPhaseChange,
  screenRef,
}: ExpertMatchAnimationProps) {
  const [phase, setPhase] = useState<ExpertMatchPhase>("inChat");
  const [faceIdx, setFaceIdx] = useState(0);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [pulses, setPulses] = useState<Pulse[]>([{ id: 0 }]);
  const [portalReady, setPortalReady] = useState(false);
  const [rippleScaleEnd, setRippleScaleEnd] = useState(5.5);
  const [faceSwapMs, setFaceSwapMs] = useState(Math.round(RIPPLE_DURATION_MS * 0.55));
  const [reassurancePulses, setReassurancePulses] = useState<Pulse[]>([]);
  const [reassuranceRippleScale, setReassuranceRippleScale] = useState(8);
  const pulseIdRef = useRef(0);
  const reassurancePulseIdRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const reassuranceRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const advanceExpert = useCallback(() => {
    if (phaseRef.current !== "inChat") return;

    setFaceIdx((i) => (i + 1) % EXPERT_FACES.length);

    pulseIdRef.current += 1;
    const id = pulseIdRef.current;
    setPulses((prev) => [...prev, { id }]);
    window.setTimeout(() => {
      setPulses((prev) => prev.filter((pulse) => pulse.id !== id));
    }, PULSE_CLEANUP_MS);
  }, []);

  useEffect(() => {
    if (phase !== "inChat") return;

    let timeoutId = 0;

    const scheduleNextFace = () => {
      timeoutId = window.setTimeout(() => {
        advanceExpert();
        scheduleNextFace();
      }, faceSwapMs);
    };

    scheduleNextFace();
    return () => window.clearTimeout(timeoutId);
  }, [phase, faceSwapMs, advanceExpert]);

  useEffect(() => {
    if (phase !== "inChat") return;

    const tickerMs = Math.max(400, Math.round(faceSwapMs / TICKER_RATE));
    const id = window.setInterval(() => {
      if (phaseRef.current !== "inChat") return;
      setTickerIdx((i) => (i + 1) % SKILL_TICKER.length);
    }, tickerMs);

    return () => window.clearInterval(id);
  }, [phase, faceSwapMs]);

  useEffect(() => {
    if (phase !== "reassurance") {
      setReassurancePulses([]);
      return;
    }

    let timeoutId = 0;
    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const setup = () => {
      const container = reassuranceRef.current;
      if (!container) {
        requestAnimationFrame(setup);
        return;
      }
      if (cancelled) return;

      const updateScale = () => {
        setReassuranceRippleScale(measureRippleScaleEnd(container));
      };

      updateScale();
      ro = new ResizeObserver(updateScale);
      ro.observe(container);

      reassurancePulseIdRef.current = 0;
      setReassurancePulses([{ id: 0 }]);

      const addReassurancePulse = () => {
        reassurancePulseIdRef.current += 1;
        const id = reassurancePulseIdRef.current;
        setReassurancePulses((prev) => [...prev, { id }]);
        window.setTimeout(() => {
          setReassurancePulses((prev) => prev.filter((pulse) => pulse.id !== id));
        }, PULSE_CLEANUP_MS);
      };

      let pulseMs = faceSwapMs;

      const schedulePulse = () => {
        timeoutId = window.setTimeout(() => {
          if (phaseRef.current !== "reassurance") return;
          addReassurancePulse();
          pulseMs = faceSwapMs;
          schedulePulse();
        }, pulseMs);
      };

      schedulePulse();
    };

    setup();

    return () => {
      cancelled = true;
      ro?.disconnect();
      window.clearTimeout(timeoutId);
    };
  }, [phase, faceSwapMs]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase === "inChat") {
      const id = window.setTimeout(() => setPhase("reassurance"), IN_CHAT_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === "reassurance") {
      const id = window.setTimeout(() => setPhase("benResult"), REASSURANCE_MS);
      return () => window.clearTimeout(id);
    }
  }, [phase]);


  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (phase !== "inChat") return;
    const card = cardRef.current;
    if (!card) return;

    const updateRippleScale = () => {
      const scaleEnd = measureRippleScaleEnd(card);
      setRippleScaleEnd(scaleEnd);
      setFaceSwapMs(measureFaceSwapMs(card, scaleEnd));
    };

    updateRippleScale();
    const ro = new ResizeObserver(updateRippleScale);
    ro.observe(card);
    return () => ro.disconnect();
  }, [phase]);

  useEffect(() => {
    const frame = getDeviceFrame(screenRef.current);
    if (!frame) return;
    const active = phase !== "inChat";
    frame.classList.toggle("diwm-device-frame--expert-match-fullscreen", active);
    return () => {
      frame.classList.remove("diwm-device-frame--expert-match-fullscreen");
    };
  }, [phase, screenRef, portalReady]);

  const inChatCard = (
    <div
      ref={cardRef}
      className="expert-match-card etrade-flow--fade-in"
      role="status"
      aria-live="polite"
      aria-label="Finding your expert match"
    >
      <h2 className="expert-match-card__title">Finding your expert match</h2>
      <p className="expert-match-card__subtitle">
        We&rsquo;ll make sure you have the right expert team behind you&mdash;every step of the way.
      </p>
      <div
        className="expert-match-card__stage"
        style={
          {
            "--expert-pulse-duration": `${RIPPLE_DURATION_MS}ms`,
            "--expert-cycle-duration": `${CYCLE_TRANSITION_MS}ms`,
            "--ripple-scale-end": rippleScaleEnd,
          } as React.CSSProperties
        }
      >
        <div className="expert-match-card__radar">
          <div className="expert-match-card__face-wrap">
            {renderRipplePulses(pulses)}
            {EXPERT_FACES.map((face, i) => (
              <img
                key={face.src}
                src={face.src}
                alt={face.alt}
                className={`expert-match-card__face${i === faceIdx ? " expert-match-card__face--active" : ""}`}
                width={96}
                height={96}
              />
            ))}
          </div>
        </div>
        <div className="expert-match-card__ticker" aria-hidden>
          {SKILL_TICKER.map((label, i) => (
            <span
              key={label}
              className={`expert-match-card__ticker-item${i === tickerIdx ? " expert-match-card__ticker-item--active" : ""}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const reassurance = (
    <div
      ref={reassuranceRef}
      className="expert-anim expert-anim--fullscreen expert-anim--reassurance"
      role="dialog"
      aria-label="Matching your expert"
      aria-live="polite"
    >
      <div className="expert-anim__bg" aria-hidden />
      <div
        className="expert-anim__ripple-stage"
        style={rippleStageStyle(reassuranceRippleScale)}
        aria-hidden
      >
        <div className="expert-anim__ripple-origin" />
        {renderRipplePulses(reassurancePulses)}
      </div>
      <div className="expert-anim__reassurance">
        <h2 className="expert-anim__reassurance-heading">
          <span className="expert-anim__reassurance-line">Chloe,</span>
          <span className="expert-anim__reassurance-line">you&rsquo;re in good hands.</span>
          <span className="expert-anim__reassurance-line expert-anim__reassurance-line--meet">
            Meet&hellip;
          </span>
        </h2>
      </div>
    </div>
  );

  const benResult = (
    <div
      className="expert-anim expert-anim--fullscreen expert-anim--result"
      role="dialog"
      aria-label="Your matched expert"
    >
      <div className="expert-anim__bg" aria-hidden />
      <div
        className="expert-anim__rings expert-anim__rings--result expert-anim__rings--visible"
        aria-hidden
      >
        <div className="expert-anim__ring expert-anim__ring--1" />
        <div className="expert-anim__ring expert-anim__ring--2" />
        <div className="expert-anim__ring expert-anim__ring--3" />
        <div className="expert-anim__ring expert-anim__ring--4" />
      </div>
      <div className="expert-anim__result">
        <div className="expert-anim__result-scroll">
          <div className="expert-anim__composition">
            <div className="expert-anim__photo expert-anim__photo--lead">
              <img src="images/ben.png" alt="" className="expert-anim__photo-img" />
            </div>
            <div className="expert-anim__photo-stack">
              <div className="expert-anim__photo expert-anim__photo--team">
                <img src="images/franklin.png" alt="" className="expert-anim__photo-img" />
              </div>
              <div className="expert-anim__photo expert-anim__photo--team">
                <img src="images/daniella.png" alt="" className="expert-anim__photo-img" />
              </div>
            </div>
          </div>

          <div className="expert-anim__meta">
            <div className="expert-anim__meta-head">
              <h2 className="expert-anim__name">Ben B.</h2>
              <p className="expert-anim__team-line">
                <img
                  src="images/arrow-reply.png"
                  alt=""
                  className="expert-anim__team-line-icon"
                  width={22}
                  height={22}
                />
                Plus a team for year-round help
              </p>
            </div>

            <div className="expert-anim__stats">
              <div className="expert-anim__rating">
                <span className="expert-anim__star" aria-hidden>
                  &#9733;
                </span>
                <span className="expert-anim__score">4.9</span>
                <span className="expert-anim__count">(418)</span>
              </div>
              <p className="expert-anim__exp">13 yrs experience</p>
              <div className="expert-anim__status-badges">
                <span className="expert-anim__available">
                  <span className="expert-anim__available-dot" aria-hidden />
                  Available now
                </span>
                <StatusPillBestOutcome />
              </div>
            </div>

            <div className="expert-anim__skills-block">
              <p className="expert-anim__skilled-label">Skilled in:</p>
              <div className="expert-anim__tags">
                <span className="expert-anim__tag">W-2</span>
                <span className="expert-anim__tag">Investments</span>
                <span className="expert-anim__tag">Multi-state taxes</span>
                <span className="expert-anim__tag">WA taxes</span>
              </div>
            </div>
          </div>
        </div>

        <div className="expert-anim__result-foot">
          <button type="button" className="expert-anim__continue" onClick={onDone}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  const fullscreen =
    phase === "reassurance" ? reassurance : phase === "benResult" ? benResult : null;

  const portalTarget =
    portalReady && phase !== "inChat"
      ? getDeviceFrame(screenRef.current)
      : null;

  return (
    <>
      {phase === "inChat" && inChatCard}
      {fullscreen && portalTarget && createPortal(fullscreen, portalTarget)}
    </>
  );
}
