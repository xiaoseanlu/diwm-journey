import { useState, useCallback, useRef, useEffect, type TouchEvent } from "react";
import { Button, ChoiceTile, Link, Tabs } from "cds-react-components/src/components";
import "./diwm-journey.css";
import { AppointmentUpcomingScreen } from "./AppointmentUpcomingScreen";
import { AppointmentSmsLockScreen } from "./AppointmentSmsLockScreen";
import { DocUploadPickerScreen } from "./DocUploadPickerScreen";
import { BenIncomingCallSheet } from "./BenIncomingCallSheet";
import { BenVideoCallFrame } from "./BenVideoCallFrame";
import { DeviceFrameSheetPortal } from "./DeviceFrameSheetPortal";
import { Form8889ReviewSheet } from "./Form8889ReviewSheet";
import { ReturnReviewedScreen } from "./ReturnReviewedScreen";
import { PlanAheadScreen } from "./PlanAheadScreen";
import { MidYearCheckInScreen } from "./MidYearCheckInScreen";
import { ReferFriendScreen } from "./ReferFriendScreen";
import type { ScheduledAppointment, ScheduleCallHandlers } from "./ExpertReviewSchedulePaths";
import { PostCallFlow, type PostCallCoverageOutcome, type PostCallPhase } from "./PostCallFlow";
import { StatusPillBestOutcome } from "./StatusPillBestOutcome";
import {
  DiwmAssistedToolbar,
  DiwmBackToolbar,
  DiwmPrimaryButton,
  DiwmSkuToolbar,
  SkuLandingChoiceTile,
} from "./diwm-cds-chrome";
import {
  buildDiwmHash,
  DIWM_JUMP_GROUPS,
  DIWM_POST_CALL_STAGES,
  DIWM_STAGE_JUMP_VALUES,
  getAppHash,
  parseDiwmRoute,
  type DiwmScreenSlug,
} from "./diwm-journey-routing";
import { DiwmAiComposer, DIWM_BEN_MATCHED_STAGE, resolveShareDocsComposerExpertAvatar, resolveShareDocsComposerExpertInteraction, resolveShareDocsComposerExpertLabel } from "./diwm-ai-composer";
import { DiwmPreMatchExpertComposer } from "./DiwmPreMatchExpertComposer";
import { ExpertUpgradeSheet } from "./ExpertUpgradeSheet";
import { ExpertMatchAnimation, type ExpertMatchPhase } from "./ExpertMatchAnimation";
import { IntuitAssistBrand } from "./IntuitAssistBrand";
import {
  getShareDocsInitialState,
  SHARE_DOCS_PREVIEW_EXPLAIN_SELECTION,
} from "./share-docs-preview";

export type { ScheduleCallHandlers };

/** Forward map: PostCallFlow phase → its canonical synthetic stage (for "Jump to…" tracking). */
const POST_CALL_PHASE_TO_STAGE: Record<PostCallPhase, number> = {
  transcribing: 47,
  recap: 48,
  "docs-prompt": 49,
  "docs-reply": 49,
  processing: 50,
  "state-interim": 51,
  "refund-estimate": 52,
};

type Screen = DiwmScreenSlug;

/* ━━━ Word-by-word streaming text (Claude-style) ━━━ */

function StreamText({
  text,
  msPerWord = 65,
  onDone,
  className,
  as: Tag = "span",
  instant = false,
}: {
  text: string;
  msPerWord?: number;
  onDone?: () => void;
  className?: string;
  as?: "span" | "p" | "h1";
  instant?: boolean;
}) {
  if (instant) {
    return <Tag className={className}>{text}</Tag>;
  }

  const words = text.split(" ");
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (count < words.length) {
      const id = setTimeout(() => setCount((c) => c + 1), msPerWord);
      return () => clearTimeout(id);
    }
    if (!doneRef.current && onDone) {
      doneRef.current = true;
      onDone();
    }
  }, [count, words.length, msPerWord, onDone]);

  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className={`stream-word${i < count ? " stream-word--visible" : ""}`}
        >
          {w}{" "}
        </span>
      ))}
    </Tag>
  );
}
type SkuLandingChoice = "expert" | "diy";

const PROGRESS_MAP: Record<Screen, number> = {
  landing: 8,
  "welcome-hub": 10,
  "welcome-chloe": 12,
  hub: 25,
  connect: 15,
  explain: 15,
  "share-docs": 20,
  "tax-story": 30,
};

const CONNECT_PROVIDERS = [
  { id: "google" as const, name: "Google", icon: "images/google.png" },
  { id: "apple" as const, name: "Apple", icon: "images/apple.png" },
  { id: "microsoft" as const, name: "Microsoft", icon: "images/microsoft.png" },
];

const CONNECTION_PROVIDER_IDS = CONNECT_PROVIDERS.map((p) => p.id);

type ConnectionsDismissMethod = "x" | "swipe" | "tap_outside";

type ConnectionsDrawerDismissPayload = {
  entry_point: string;
  connections_shown: string[];
  selected: "none";
  dismiss_method: ConnectionsDismissMethod;
};

function trackConnectionsDrawerDismissed(payload: ConnectionsDrawerDismissPayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("analytics", {
        detail: { event: "connections_drawer_dismissed", ...payload },
      }),
    );
  }
  if (import.meta.env.DEV) {
    console.info("[analytics] connections_drawer_dismissed", payload);
  }
}

function ConnectionsDrawer({
  entryPoint,
  onDismiss,
  onBackInDrawer,
  onProviderSelect,
}: {
  entryPoint: string;
  onDismiss: (method: ConnectionsDismissMethod) => void;
  /** In-drawer back: close sheet only, no dismiss-recovery flow */
  onBackInDrawer: () => void;
  onProviderSelect: (providerId: (typeof CONNECT_PROVIDERS)[number]["id"]) => void;
}) {
  const swipeStartY = useRef(0);
  const swipeDismissed = useRef(false);

  const fireDismiss = useCallback(
    (method: ConnectionsDismissMethod) => {
      if (swipeDismissed.current) return;
      swipeDismissed.current = true;
      trackConnectionsDrawerDismissed({
        entry_point: entryPoint,
        connections_shown: [...CONNECTION_PROVIDER_IDS],
        selected: "none",
        dismiss_method: method,
      });
      onDismiss(method);
    },
    [entryPoint, onDismiss],
  );

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    swipeDismissed.current = false;
    swipeStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const deltaY = e.changedTouches[0].clientY - swipeStartY.current;
    if (deltaY > 56) fireDismiss("swipe");
  };

  return (
    <DeviceFrameSheetPortal className="connect-scrim" onClick={() => fireDismiss("tap_outside")}>
      <div
        className="connect-sheet connect-sheet--animate"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="connect-sheet__header">
          <button
            type="button"
            className="connect-sheet__back"
            onClick={onBackInDrawer}
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 16l-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="connect-sheet__title">Connections</h2>
          <button
            type="button"
            className="connect-sheet__close"
            onClick={() => fireDismiss("x")}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l8 8M13 5l-8 8"/></svg>
          </button>
        </div>
        <div className="connect-sheet__list">
          {CONNECT_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="connect-row"
              onClick={() => onProviderSelect(p.id)}
            >
              <div className="connect-row__icon-ring">
                <img className="connect-row__icon" src={p.icon} alt={p.name} />
              </div>
              <span className="connect-row__name">{p.name}</span>
              <svg className="connect-row__chevron" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4l5 5-5 5"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
    </DeviceFrameSheetPortal>
  );
}

const SCHEDULE_WEEK_DAYS = [
  { id: 4, dow: "Sun", label: "Sunday, April 4, 2026" },
  { id: 5, dow: "Mon", label: "Monday, April 5, 2026" },
  { id: 6, dow: "Tue", label: "Tuesday, April 6, 2026" },
  { id: 7, dow: "Wed", label: "Wednesday, April 7, 2026" },
  { id: 8, dow: "Thu", label: "Thursday, April 8, 2026" },
  { id: 9, dow: "Fri", label: "Friday, April 9, 2026" },
  { id: 10, dow: "Sat", label: "Saturday, April 10, 2026" },
] as const;

const SCHEDULE_MORNING_SLOTS = ["9:45 AM", "11:30 AM"];
const SCHEDULE_AFTERNOON_SLOTS = ["12:45 PM", "1:15 PM", "2:00 PM", "2:45 PM", "3:30 PM", "4:15 PM"];

const UPCOMING_APPOINTMENT_PREVIEW: ScheduledAppointment = {
  dayId: 4,
  slot: "9:45 AM",
  dayLabel: "Monday, April 4, 2026",
};

function upcomingAppointmentForStage(stage: number): ScheduledAppointment | null {
  return DIWM_POST_CALL_STAGES[stage]?.appointmentUpcoming ? UPCOMING_APPOINTMENT_PREVIEW : null;
}

function ScheduleCallFlow({
  onBooked,
  onDismiss,
  onStepChange,
  initialStep = "calendar",
}: {
  onBooked: (appointment: ScheduledAppointment) => void;
  onDismiss: () => void;
  /** Report the active sheet step upward (for "Jump to…" current-step tracking). */
  onStepChange?: (step: "calendar" | "confirmed") => void;
  /** Deep-link preview: land directly on the calendar or confirmation step. */
  initialStep?: "calendar" | "confirmed";
}) {
  const [step, setStep] = useState<"calendar" | "confirmed">(initialStep);

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);
  const [selectedDayId, setSelectedDayId] = useState(4);
  const [selectedSlot, setSelectedSlot] = useState("9:45 AM");
  const dismissReadyRef = useRef(false);

  const selectedDay = SCHEDULE_WEEK_DAYS.find((d) => d.id === selectedDayId) ?? SCHEDULE_WEEK_DAYS[0];

  /* Ignore scrim taps briefly after open / step change — the same click that opens
     the sheet or taps Continue must not bubble to the scrim and dismiss the flow. */
  useEffect(() => {
    dismissReadyRef.current = false;
    const id = window.setTimeout(() => {
      dismissReadyRef.current = true;
    }, 150);
    return () => window.clearTimeout(id);
  }, [step]);

  const handleDismiss = () => {
    if (!dismissReadyRef.current) return;
    onDismiss();
  };

  const handleBooked = () => {
    onBooked({
      dayId: selectedDayId,
      slot: selectedSlot,
      dayLabel: selectedDay.label,
    });
  };

  const handleContinueToConfirm = () => {
    setStep("confirmed");
  };

  return (
    <DeviceFrameSheetPortal className="connect-scrim" onClick={handleDismiss}>
      <div
        className={`schedule-sheet${step === "confirmed" ? " schedule-sheet--confirmed" : " schedule-sheet--calendar"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {step === "confirmed" ? (
          <>
          <div className="schedule-sheet__header">
            <span aria-hidden="true" style={{ width: 26 }} />
            <button
              type="button"
              className="schedule-sheet__close schedule-sheet__close--confirm"
              onClick={handleDismiss}
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6l-12 12"/>
              </svg>
            </button>
          </div>
          <div className="schedule-sheet__confirm-body">
            <div className="schedule-sheet__confirm-text">
              <h2 className="schedule-sheet__confirm-title">
                Your appointment is set for <strong>April {selectedDayId}</strong> at {selectedSlot} PT
              </h2>
              <p className="schedule-sheet__confirm-sub">
                We&rsquo;ll call you over a one-way video call.
              </p>
            </div>
            <div className="schedule-sheet__confirm-art" aria-hidden="true">
              <img
                src="images/appointment-visual.png"
                alt=""
                className="schedule-sheet__confirm-art-img"
                width={240}
                height={315}
              />
            </div>
          </div>
          <div className="schedule-sheet__footer">
            <Button variant="primary" size="large" label="Got it" className="schedule-sheet__continue w-full" onClick={handleBooked} />
          </div>
          </>
        ) : (
          <>
        <div className="schedule-sheet__header">
          <h2 className="schedule-sheet__title">Setting up your appointment</h2>
          <button
            type="button"
            className="schedule-sheet__close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l8 8M13 5l-8 8"/>
            </svg>
          </button>
        </div>
        <div className="schedule-sheet__body">
          <div className="schedule-sheet__month-nav">
            <span className="schedule-sheet__month-label">April 2026</span>
            <div className="schedule-sheet__month-btns">
              <button type="button" className="schedule-sheet__month-btn" aria-label="Previous month">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 16l-6-6 6-6"/>
                </svg>
              </button>
              <button type="button" className="schedule-sheet__month-btn" aria-label="Next month">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 4l5 5-5 5"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="schedule-sheet__dates">
            <div className="schedule-sheet__week">
              {SCHEDULE_WEEK_DAYS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`schedule-sheet__day${selectedDayId === d.id ? " schedule-sheet__day--selected" : ""}`}
                  onClick={() => setSelectedDayId(d.id)}
                >
                  <span className="schedule-sheet__day-dow">{d.dow}</span>
                  <span className="schedule-sheet__day-num">{d.id}</span>
                </button>
              ))}
            </div>
            <button type="button" className="schedule-sheet__expand" aria-label="Show more dates">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 8l5 5 5-5"/>
              </svg>
            </button>
          </div>
          <div className="schedule-sheet__times">
            <div className="schedule-sheet__date-block">
              <h3 className="schedule-sheet__date-heading">{selectedDay.label}</h3>
              <p className="schedule-sheet__tz">
                Times are shown in <span className="schedule-sheet__tz-code">PDT</span>.
              </p>
            </div>
            <div className="schedule-sheet__period-group">
              <p className="schedule-sheet__period">Morning</p>
              <div className="schedule-sheet__slots">
                {SCHEDULE_MORNING_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`schedule-sheet__slot${selectedSlot === slot ? " schedule-sheet__slot--selected" : ""}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="schedule-sheet__period-group">
              <p className="schedule-sheet__period">Afternoon</p>
              <div className="schedule-sheet__slots">
                {SCHEDULE_AFTERNOON_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`schedule-sheet__slot${selectedSlot === slot ? " schedule-sheet__slot--selected" : ""}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="schedule-sheet__period-group">
              <p className="schedule-sheet__period">Evening</p>
              <p className="schedule-sheet__unavailable">No availability</p>
            </div>
          </div>
        </div>
        <div className="schedule-sheet__footer">
          <Button
            variant="primary"
            size="large"
            label="Continue"
            className="schedule-sheet__continue w-full"
            onClick={handleContinueToConfirm}
          />
        </div>
          </>
        )}
      </div>
    </DeviceFrameSheetPortal>
  );
}

export type ExplainSelection = {
  pills: string[];
  location: string;
};

export type TaxStoryTaxesVariant =
  | "complete-with-state-refund"
  | "deductions-expanded"
  | "empty-start"
  | "in-progress-with-expert"
  | "expert-final-review"
  | "mid-progress";

function resolveInitialScreen(routeBase: string, initialScreen?: Screen): Screen {
  const { screen } = parseDiwmRoute(getAppHash(), routeBase);
  if (screen) return screen;
  return initialScreen ?? "landing";
}

function resolveInitialTaxTab(routeBase: string): "taxes" | "tools" {
  const { tab } = parseDiwmRoute(getAppHash(), routeBase);
  if (tab) return tab;
  return "taxes";
}

/** Deep-linked share-docs chat stage from the URL (`…/share-docs?stage=46`), if any. */
function resolveInitialStage(routeBase: string): number | null {
  const { screen, stage } = parseDiwmRoute(getAppHash(), routeBase);
  return screen === "share-docs" ? stage : null;
}

export function DiwmJourney({
  routeBase = "diwm-journey/mweb",
  syncScreenUrl = false,
  taxesVariant = "deductions-expanded",
  initialScreen,
  postCallCoverage = "all-covered",
  postCallPreview = false,
  postCallSkipToChecks = false,
  postCallPreviewPhase,
  postCallPreviewExpertReview = false,
  previewAppointmentUpcoming = false,
  previewReturnReviewed = false,
  shareDocsPreviewStage,
  shareDocsPreviewMode,
}: {
  /** Registry platform route — used for per-screen deep links when `syncScreenUrl` is set. */
  routeBase?: string;
  /** DIWM Customer Journey only — sync in-flow screens to `#/route/screen`. */
  syncScreenUrl?: boolean;
  taxesVariant?: TaxStoryTaxesVariant;
  initialScreen?: Screen;
  /** TODO(coverage): Wire from doc-coverage API — preview via registry routes */
  postCallCoverage?: PostCallCoverageOutcome;
  /** Skip to post-call flow (Ben ended + doc prompt) for design review */
  postCallPreview?: boolean;
  /** Start at running-checks animation (with postCallPreview) */
  postCallSkipToChecks?: boolean;
  /** Jump to a specific post-call step (design review) */
  postCallPreviewPhase?: PostCallPhase;
  postCallPreviewExpertReview?: boolean;
  /** Design preview: appointment upcoming full screen */
  previewAppointmentUpcoming?: boolean;
  /** Design preview: return reviewed by Ben (expert final review + Ben on call) */
  previewReturnReviewed?: boolean;
  /** Jump share-docs to a checkpoint stage (design review). */
  shareDocsPreviewStage?: number;
  /** Freeze share-docs auto-advance timers (defaults true when shareDocsPreviewStage set). */
  shareDocsPreviewMode?: boolean;
} = {}) {
  const shareDocsPreviewActive = shareDocsPreviewStage != null;
  const shareDocsFrozen =
    shareDocsPreviewMode ?? shareDocsPreviewActive;

  /** Live deep-link stage from the URL (only the DIWM Customer Journey syncs the URL). */
  const urlInitialStage = syncScreenUrl ? resolveInitialStage(routeBase) : null;

  const journeyStart = (() => {
    if (postCallPreview || shareDocsPreviewActive) {
      return { screen: "share-docs" as Screen, chatActive: true };
    }
    const screen =
      syncScreenUrl
        ? resolveInitialScreen(routeBase, initialScreen)
        : (initialScreen ?? "landing");
    return {
      screen,
      chatActive: screen === "share-docs" || screen === "tax-story",
    };
  })();

  const [screen, setScreenState] = useState<Screen>(journeyStart.screen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [docsUploaded, setDocsUploaded] = useState(
    postCallPreview || shareDocsPreviewActive,
  );
  const [signedIn, setSignedIn] = useState(false);
  const [signOnOpen, setSignOnOpen] = useState(false);
  const [explainSelection, setExplainSelection] = useState<ExplainSelection>(
    shareDocsPreviewActive
      ? SHARE_DOCS_PREVIEW_EXPLAIN_SELECTION
      : { pills: [], location: "" },
  );
  const [explainPillEdit, setExplainPillEdit] = useState(false);
  const [shareDocsResumeStage, setShareDocsResumeStage] = useState(
    postCallPreview ? 46 : urlInitialStage ?? shareDocsPreviewStage ?? 0,
  );
  /** Bumped to remount the chat when an external URL change jumps to a new stage. */
  const [chatKey, setChatKey] = useState(0);
  const [chatActive, setChatActive] = useState(journeyStart.chatActive);
  const [taxStoryTab, setTaxStoryTab] = useState<"taxes" | "tools">(() =>
    syncScreenUrl ? resolveInitialTaxTab(routeBase) : "taxes",
  );
  const [gmailImportedFiles, setGmailImportedFiles] = useState<string[]>(
    () => getShareDocsInitialState(postCallPreview ? 46 : urlInitialStage ?? shareDocsPreviewStage ?? 0).gmailImportedFiles,
  );
  const [appointmentSmsLockOpen, setAppointmentSmsLockOpen] = useState(false);
  const [appointmentDismissToken, setAppointmentDismissToken] = useState(0);
  /** Lives on the journey host so it survives ShareDocsScreen remounts (chatKey / URL jumps). */
  const [bookedAppointment, setBookedAppointment] = useState<ScheduledAppointment | null>(() => {
    if (previewAppointmentUpcoming) return UPCOMING_APPOINTMENT_PREVIEW;
    const initialStage = postCallPreview ? 46 : urlInitialStage ?? shareDocsPreviewStage ?? 0;
    return upcomingAppointmentForStage(initialStage);
  });

  useEffect(() => {
    if (appointmentDismissToken > 0) {
      setBookedAppointment(null);
    }
  }, [appointmentDismissToken]);
  const [taxesVariantActive, setTaxesVariantActive] = useState<TaxStoryTaxesVariant>(taxesVariant);
  /** Deep-link preview overlays for the expert-review live-call flow (driven by the Jump-to menu). */
  const [previewScheduleStep, setPreviewScheduleStep] = useState<"calendar" | "confirmed" | null>(null);
  /** Live schedule-sheet step reported up from ShareDocsScreen — drives "Jump to…" tracking. */
  const [liveScheduleStep, setLiveScheduleStep] = useState<"calendar" | "confirmed" | null>(null);
  const [taxStoryReturnReviewed, setTaxStoryReturnReviewed] = useState(previewReturnReviewed);
  const [taxStoryPlanAhead, setTaxStoryPlanAhead] = useState(false);
  const [taxStoryMidYearCheckIn, setTaxStoryMidYearCheckIn] = useState(false);
  const [taxStoryReferFriend, setTaxStoryReferFriend] = useState(false);
  const [taxStoryVideoCall, setTaxStoryVideoCall] = useState(false);
  const [taxStoryIncomingCall, setTaxStoryIncomingCall] = useState(false);
  const [taxStoryHsaReview, setTaxStoryHsaReview] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);
  /** Latest chat stage reported up from ShareDocsScreen — kept in the URL for deep links. */
  const syncedStageRef = useRef<number | null>(
    postCallPreview ? 46 : urlInitialStage ?? shareDocsPreviewStage ?? 0,
  );
  /** Reactive mirror of the chat stage — drives the side-nav SKU label (DIY vs Expert Assist). */
  const [chatStage, setChatStage] = useState<number>(
    postCallPreview ? 46 : urlInitialStage ?? shareDocsPreviewStage ?? 0,
  );
  /**
   * Post-wrap-up position (synthetic stages ≥47) tracked independently of the chat stage.
   * The chat component keeps reporting its own clamped stage (≤46) after wrap-up, so it can't
   * be used to drive the "Jump to…" highlight here — this dedicated state owns the post-call
   * section and is never overwritten by chat-stage reports.
   */
  const [postCallStage, setPostCallStage] = useState<number | null>(null);
  /** Live tax-story sub-step reported up from TaxStoryScreen — drives "Jump to…" tracking. */
  const [liveTaxStoryStep, setLiveTaxStoryStep] = useState<string | null>(null);
  /* The post-wrap-up flow only lives on the share-docs screen, and the tax-story sub-step only on
     tax-story — drop them when the user navigates elsewhere so the Jump-to highlight doesn't bleed
     into other chapters. */
  useEffect(() => {
    if (screen !== "share-docs") setPostCallStage(null);
    if (screen !== "tax-story") setLiveTaxStoryStep(null);
  }, [screen]);
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const progress = docsUploaded ? Math.max(PROGRESS_MAP[screen], 35) : PROGRESS_MAP[screen];

  const setScreen = useCallback(
    (next: Screen, opts?: { tab?: "taxes" | "tools"; replace?: boolean }) => {
      setScreenState(next);
      if (opts?.tab) setTaxStoryTab(opts.tab);
      if (!syncScreenUrl) return;
      const hash = buildDiwmHash(routeBase, next, {
        tab: opts?.tab ?? (next === "tax-story" ? taxStoryTab : undefined),
        stage: next === "share-docs" ? syncedStageRef.current ?? undefined : undefined,
      });
      if (window.location.hash === hash) return;
      if (opts?.replace) {
        const path = hash.slice(1);
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${path}`);
      } else {
        window.location.hash = hash.slice(1);
      }
    },
    [routeBase, taxStoryTab, syncScreenUrl],
  );

  const resumeAtStage = useCallback(
    (stage: number) => {
      syncedStageRef.current = stage;
      setChatStage(stage);
      setShareDocsResumeStage(stage);
      setGmailImportedFiles(getShareDocsInitialState(stage).gmailImportedFiles);
      setChatActive(true);
      setChatKey((k) => k + 1);
    },
    [],
  );

  /**
   * Dev "Jump to…" dropdown. Supported values:
   *   `stage:<n>` · `screen:<slug>` · `screen:tax-story?<tab>`
   *   `schedule:calendar|confirmed` (open the schedule sheet over the expert-review chat)
   *   `push-notification` (upcoming appointment + SMS lock screen)
   *   `taxstory:...|mid-year-check-in|refer-friend`
   */
  const jumpTo = useCallback(
    (value: string) => {
      /* Clear any expert-review preview overlays so chapters don't bleed into each other. */
      setAppointmentSmsLockOpen(false);
      setPostCallStage(null);
      setPreviewScheduleStep(null);
      setBookedAppointment(null);
      setTaxStoryReturnReviewed(false);
      setTaxStoryPlanAhead(false);
      setTaxStoryMidYearCheckIn(false);
      setTaxStoryReferFriend(false);
      setTaxStoryVideoCall(false);
      setTaxStoryIncomingCall(false);
      setTaxStoryHsaReview(false);

      if (value.startsWith("stage:")) {
        const stage = Number.parseInt(value.slice(6), 10) || 0;
        resumeAtStage(stage);
        setPostCallStage(stage >= 47 ? stage : null);
        setBookedAppointment(upcomingAppointmentForStage(stage));
        setScreen("share-docs");
        return;
      }
      if (value.startsWith("schedule:")) {
        const step = value.slice("schedule:".length) === "confirmed" ? "confirmed" : "calendar";
        resumeAtStage(53);
        setPostCallStage(53);
        setPreviewScheduleStep(step);
        setScreen("share-docs");
        return;
      }
      if (value === "push-notification") {
        resumeAtStage(55);
        setPostCallStage(55);
        setBookedAppointment(UPCOMING_APPOINTMENT_PREVIEW);
        setScreen("share-docs");
        setAppointmentSmsLockOpen(true);
        return;
      }
      if (value.startsWith("taxstory:")) {
        const kind = value.slice("taxstory:".length);
        setTaxStoryReturnReviewed(kind === "return-reviewed");
        setTaxStoryPlanAhead(kind === "plan-ahead");
        setTaxStoryMidYearCheckIn(kind === "mid-year-check-in");
        setTaxStoryReferFriend(kind === "refer-friend");
        setTaxStoryVideoCall(
          kind === "live-review" ||
            kind === "return-reviewed" ||
            kind === "plan-ahead",
        );
        setTaxStoryIncomingCall(kind === "incoming-call");
        setTaxStoryHsaReview(kind === "hsa-review");
        setTaxesVariantActive("expert-final-review");
        setTaxStoryTab("taxes");
        setScreen("tax-story", { tab: "taxes" });
        return;
      }
      if (value.startsWith("screen:")) {
        const [slug, tab] = value.slice(7).split("?");
        setScreen(
          slug as Screen,
          tab === "taxes" || tab === "tools" ? { tab } : undefined,
        );
      }
    },
    [resumeAtStage, setScreen],
  );

  /** Chat reports its stage as it advances → mirror it into the URL (replace, no history spam). */
  const handleChatStageChange = useCallback(
    (s: number) => {
      syncedStageRef.current = s;
      setChatStage(s);
      if (!syncScreenUrl || screenRef.current !== "share-docs") return;
      const hash = buildDiwmHash(routeBase, "share-docs", { stage: s });
      if (window.location.hash === hash) return;
      const path = hash.slice(1);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${path}`,
      );
    },
    [routeBase, syncScreenUrl],
  );

  /* Post-wrap-up phases run on synthetic stages (≥47). Mirror them into chatStage so the
     "Jump to…" dropdown keeps tracking the current step past Ben's wrap-up. */
  const handlePostCallPhaseChange = useCallback((phase: PostCallPhase) => {
    const stage = POST_CALL_PHASE_TO_STAGE[phase];
    if (stage == null) return;
    // Don't regress past an explicit expert-review stage (53–56) picked via the Jump-to menu —
    // those share the "refund-estimate" phase but represent later points in the flow.
    setPostCallStage((prev) => (prev != null && prev >= 53 ? prev : stage));
  }, []);

  useEffect(() => {
    setTaxesVariantActive(taxesVariant);
  }, [taxesVariant]);

  useEffect(() => {
    if (!syncScreenUrl) return;
    const onHashChange = () => {
      const { screen: parsed, tab, stage } = parseDiwmRoute(getAppHash(), routeBase);
      if (parsed) {
        setScreenState(parsed);
        if (tab) setTaxStoryTab(tab);
        if (parsed === "share-docs" || parsed === "tax-story") setChatActive(true);
        // External jump to a new chat stage (manual URL edit / back-forward): re-seed + remount.
        if (parsed === "share-docs" && stage != null && stage !== syncedStageRef.current) {
          syncedStageRef.current = stage;
          setChatStage(stage);
          setShareDocsResumeStage(stage);
          setGmailImportedFiles(getShareDocsInitialState(stage).gmailImportedFiles);
          setChatKey((k) => k + 1);
        }
        return;
      }
      if (getAppHash() === routeBase) {
        const fallback = initialScreen ?? "landing";
        setScreenState(fallback);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [routeBase, initialScreen, syncScreenUrl]);

  const handleSmsNotificationTap = useCallback(() => {
    setAppointmentSmsLockOpen(false);
    setAppointmentDismissToken((t) => t + 1);
    setTaxesVariantActive("expert-final-review");
    setTaxStoryTab("taxes");
    setScreen("tax-story");
  }, []);

  const go = (s: Screen) => () => setScreen(s);

  const openShareDocs = useCallback(() => {
    setChatActive(true);
    setScreen("share-docs");
  }, [setScreen]);

  const handlePreMatchExpertUpgrade = useCallback(() => {
    setShareDocsResumeStage(20);
    openShareDocs();
  }, [openShareDocs]);

  const openTaxStory = (tab: "taxes" | "tools") => () => {
    setTaxStoryTab(tab);
    setScreen("tax-story", { tab });
  };

  const chatMounted =
    chatActive &&
    (screen === "share-docs" ||
      screen === "tax-story" ||
      (screen === "explain" && explainPillEdit));

  /* Synthetic resume stages (≥47) land in the post-wrap-up flow at a specific PostCallFlow
     phase — derive the preview phase/expert-review from the stage and pass them down. */
  const resumePostCall = DIWM_POST_CALL_STAGES[shareDocsResumeStage];
  const effectivePostCallPreviewPhase =
    (resumePostCall?.phase as PostCallPhase | undefined) ?? postCallPreviewPhase;
  const effectivePostCallPreviewExpertReview =
    resumePostCall?.expertReview ?? postCallPreviewExpertReview;
  const effectivePostCallSchedulePhase = resumePostCall?.schedulePhase ?? null;
  const chatVisible = screen === "share-docs";

  const handleSignOnComplete = useCallback(() => {
    setSignedIn(true);
    setSignOnOpen(false);
    if (pendingNavRef.current) {
      pendingNavRef.current();
      pendingNavRef.current = null;
    }
  }, []);

  const requestNav = useCallback((nav: () => void) => {
    if (signedIn) {
      nav();
    } else {
      pendingNavRef.current = nav;
      setSignOnOpen(true);
    }
  }, [signedIn]);

  const openProviderSignIn = useCallback((after?: () => void) => {
    if (after) pendingNavRef.current = after;
    setSignOnOpen(true);
  }, []);

  /* Reverse of jumpTo: map the live state back to the matching dropdown value so the
     "Jump to…" select highlights the current spot (native check on the selected option). */
  const currentJumpValue = (() => {
    if (screen === "tax-story") {
      // Prefer the live sub-step reported by TaxStoryScreen so organic progression (accept call →
      // live review → return reviewed → plan ahead → mid-year → refer a friend) moves the check.
      if (liveTaxStoryStep) return liveTaxStoryStep;
      if (taxStoryReferFriend) return "taxstory:refer-friend";
      if (taxStoryMidYearCheckIn) return "taxstory:mid-year-check-in";
      if (taxStoryPlanAhead) return "taxstory:plan-ahead";
      if (taxStoryReturnReviewed) return "taxstory:return-reviewed";
      if (taxStoryHsaReview) return "taxstory:hsa-review";
      if (taxStoryIncomingCall) return "taxstory:incoming-call";
      if (taxStoryVideoCall) return "taxstory:live-review";
      return taxStoryTab === "tools" ? "screen:tax-story?tools" : "screen:tax-story?taxes";
    }
    if (screen === "share-docs") {
      const scheduleStep = liveScheduleStep ?? previewScheduleStep;
      if (scheduleStep === "confirmed") return "schedule:confirmed";
      if (scheduleStep === "calendar") return "schedule:calendar";
      if (appointmentSmsLockOpen) return "push-notification";
      // The upcoming-appointment screen is driven by the booked-appointment state, not a
      // chat stage — surface it as stage 55 rather than the underlying refund-estimate stage.
      if (bookedAppointment) return "stage:55";
      // Post-wrap-up flow owns its own synthetic stage (47–56); the chat-stage fallback below
      // only applies before Ben's wrap-up.
      if (postCallStage != null) return `stage:${postCallStage}`;
      const nearest = DIWM_STAGE_JUMP_VALUES.filter((s) => s <= chatStage).pop();
      return nearest != null ? `stage:${nearest}` : "";
    }
    if (screen === "landing") return "screen:landing";
    if (screen === "welcome-hub") return "screen:welcome-hub";
    if (screen === "welcome-chloe") return "screen:welcome-chloe";
    return "";
  })();

  return (
    <div
      className={`diwm-phone${
        screen === "landing"
          ? " diwm-phone--sku-landing"
          : screen === "welcome-hub"
            ? " diwm-phone--welcome-hub"
            : screen === "welcome-chloe"
              ? " diwm-phone--welcome-chloe"
              : ""
      }${appointmentSmsLockOpen ? " diwm-phone--sms-lock" : ""}`}
    >
      {/* Menu sits behind the main surface */}
      <SideMenu
        skuLabel={chatStage >= DIWM_BEN_MATCHED_STAGE ? "Expert Assist" : "Do it yourself"}
        onClose={() => setMenuOpen(false)}
        onDocuments={() => {
          setMenuOpen(false);
          openTaxStory("tools")();
        }}
        onTaxReturn={() => {
          setMenuOpen(false);
          openTaxStory("taxes")();
        }}
      />

      {/* Main surface slides right when menu is open */}
      <div className={`diwm-main-surface${menuOpen ? " diwm-main-surface--open" : ""}`} onClick={menuOpen ? () => setMenuOpen(false) : undefined}>

        {screen === "landing" && (
          <LandingScreen
            onGetStarted={() => setScreen("welcome-hub")}
            onSignIn={() => openProviderSignIn()}
            onMenuOpen={() => setMenuOpen(true)}
          />
        )}

        {screen === "welcome-hub" && (
          <WelcomeHubScreen onStart={() => setScreen("welcome-chloe")} />
        )}

        {screen === "welcome-chloe" && (
          <WelcomeChloeScreen
            signedIn={signedIn}
            onMenuOpen={() => setMenuOpen(true)}
            onAddDocs={() => requestNav(openShareDocs)}
            onConnect={() => requestNav(go("connect"))}
            onExplain={() => requestNav(go("explain"))}
            onExpertUpgrade={handlePreMatchExpertUpgrade}
          />
        )}
        {screen === "hub" && (
          <HubScreen
            onBack={() => (docsUploaded ? openShareDocs() : setScreen("landing"))}
            progress={progress}
            docsUploaded={docsUploaded}
          />
        )}
        {screen === "connect" && (
          <ConnectScreen
            onBack={go("welcome-chloe")}
            onHubOpen={openTaxStory("taxes")}
            progress={progress}
            onProviderSignIn={() => openProviderSignIn(openShareDocs)}
            onUpload={() => requestNav(openShareDocs)}
            onEnterManually={() => requestNav(go("explain"))}
            onExpertUpgrade={handlePreMatchExpertUpgrade}
          />
        )}
        {screen === "explain" && (
          <ExplainScreen
            editOnly={explainPillEdit}
            onBack={
              explainPillEdit
                ? () => {
                    setExplainPillEdit(false);
                    openShareDocs();
                  }
                : go("welcome-chloe")
            }
            onHubOpen={openTaxStory("taxes")}
            progress={progress}
            initialSelection={explainSelection}
            onNext={(selection) => {
              setExplainSelection(selection);
              const wasPillEdit = explainPillEdit;
              setExplainPillEdit(false);
              if (!wasPillEdit) setShareDocsResumeStage(0);
              openShareDocs();
            }}
            onExpertUpgrade={handlePreMatchExpertUpgrade}
          />
        )}
        {chatMounted && (
          <div className={`diwm-chat-layer${chatVisible ? "" : " diwm-chat-layer--hidden"}`}>
            <ShareDocsScreen
              key={chatKey}
              initialStage={shareDocsResumeStage}
              onStageChange={handleChatStageChange}
              onPostCallPhaseChange={handlePostCallPhaseChange}
              onScheduleStepChange={setLiveScheduleStep}
              previewMode={shareDocsFrozen}
              postCallCoverage={postCallCoverage}
              postCallPreview={postCallPreview}
              postCallSkipToChecks={postCallSkipToChecks}
              postCallPreviewPhase={effectivePostCallPreviewPhase}
              postCallPreviewExpertReview={effectivePostCallPreviewExpertReview}
              postCallSchedulePhase={effectivePostCallSchedulePhase}
              appointmentUpcoming={bookedAppointment}
              onAppointmentUpcomingChange={setBookedAppointment}
              previewScheduleStep={previewScheduleStep}
              smsLockOpen={appointmentSmsLockOpen}
              onSmsLockOpenChange={setAppointmentSmsLockOpen}
              gmailImportedFiles={gmailImportedFiles}
              onGmailImported={setGmailImportedFiles}
              onEdit={(stage) => {
                setShareDocsResumeStage(Math.max(stage, 2));
                setExplainPillEdit(true);
                setScreen("explain");
              }}
              onMenuOpen={() => setMenuOpen(true)}
              onHubOpen={openTaxStory("taxes")}
              progress={progress}
              onDocsUploaded={() => setDocsUploaded(true)}
              onProviderSignIn={() => openProviderSignIn()}
              onTaxStory={openTaxStory("tools")}
              explainSelection={explainSelection}
              chatVisible={chatVisible}
            />
          </div>
        )}
        {screen === "tax-story" && (
          <div className="diwm-screen-layer">
            <TaxStoryScreen
              key={`${taxStoryTab}-${taxesVariantActive}-${taxStoryReturnReviewed}-${taxStoryPlanAhead}-${taxStoryMidYearCheckIn}-${taxStoryReferFriend}-${taxStoryVideoCall}-${taxStoryIncomingCall}-${taxStoryHsaReview}`}
              initialTab={taxStoryTab}
              taxesVariant={taxesVariantActive}
              onBack={openShareDocs}
              onChat={openShareDocs}
              gmailImportedFiles={gmailImportedFiles}
              initialReturnReviewed={taxStoryReturnReviewed}
              initialPlanAheadOpen={taxStoryPlanAhead}
              initialMidYearCheckInOpen={taxStoryMidYearCheckIn}
              initialReferFriendOpen={taxStoryReferFriend}
              initialVideoCallActive={
                taxStoryReturnReviewed || taxStoryVideoCall || taxStoryHsaReview || taxStoryPlanAhead
              }
              initialIncomingCallOpen={taxStoryIncomingCall}
              initialHsaReviewOpen={taxStoryHsaReview}
              onStepChange={setLiveTaxStoryStep}
            />
          </div>
        )}

      </div>

      {signOnOpen && <SignOnSheet onComplete={handleSignOnComplete} onClose={() => setSignOnOpen(false)} />}

      {appointmentSmsLockOpen && (
        <AppointmentSmsLockScreen onNotificationTap={handleSmsNotificationTap} />
      )}

      {syncScreenUrl && (
        <div className="diwm-stage-jump" onClick={(e) => e.stopPropagation()}>
          <span className="diwm-stage-jump__icon" aria-hidden>⤳</span>
          <span className="diwm-stage-jump__label" aria-hidden>Jump to…</span>
          <select
            className="diwm-stage-jump__select"
            value={currentJumpValue}
            aria-label="Jump to a stage"
            onChange={(e) => {
              if (e.target.value) jumpTo(e.target.value);
            }}
          >
            <option value="" disabled>
              Jump to…
            </option>
            {DIWM_JUMP_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((it) => (
                  <option key={`${g.group}-${it.label}`} value={it.value}>
                    {it.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/* ━━━ Sign-on bottom sheet ━━━ */

type SignOnStep = "form-blank" | "form-filled" | "code-blank" | "code-filled";

function SignOnSheet({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const [step, setStep] = useState<SignOnStep>("form-blank");

  const handleContinue = () => {
    if (step === "form-filled") setStep("code-blank");
    else if (step === "code-filled") onComplete();
  };

  return (
    <DeviceFrameSheetPortal className="signon-scrim" onClick={onClose}>
      <div className="signon-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="signon-sheet__header">
          <img className="signon-sheet__logo" src="images/intuit.png" alt="Intuit" />
          <button className="signon-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15"/>
            </svg>
          </button>
        </div>

        {(step === "form-blank" || step === "form-filled") && (
          <div className="signon-sheet__body">
            <h2 className="signon-sheet__title">Personalize and secure<br/>your account</h2>
            <p className="signon-sheet__subtitle">Sign in or create an account.</p>

            <label className="signon-field">
              <span className="signon-field__label">Your name</span>
              <div
                className={`signon-field__input${step === "form-filled" ? " signon-field__input--filled" : " signon-field__input--empty"}`}
                onClick={() => step === "form-blank" && setStep("form-filled")}
              >
                {step === "form-filled" ? "Chloe Green" : ""}
              </div>
            </label>

            <label className="signon-field">
              <span className="signon-field__label">Phone number or email</span>
              <div
                className={`signon-field__input${step === "form-filled" ? " signon-field__input--filled" : " signon-field__input--empty"}`}
                onClick={() => step === "form-blank" && setStep("form-filled")}
              >
                {step === "form-filled" ? "chloe@gmail.com" : ""}
              </div>
            </label>
          </div>
        )}

        {(step === "code-blank" || step === "code-filled") && (
          <div className="signon-sheet__body">
            <h2 className="signon-sheet__title">Enter your code</h2>
            <p className="signon-sheet__subtitle">We sent a 6-digit code to chloe@gmail.com</p>

            <div className="signon-code-boxes" onClick={() => step === "code-blank" && setStep("code-filled")}>
              {(step === "code-filled" ? ["5","2","4","1","8","7"] : ["","","","","",""]).map((d, i) => (
                <div key={i} className={`signon-code-box${!d && i === 0 ? " signon-code-box--focus" : ""}${d ? " signon-code-box--filled" : ""}${!d ? " signon-code-box--tap" : ""}`}>
                  {d}
                </div>
              ))}
            </div>

            <p className="signon-sheet__resend">
              Didn&apos;t receive a code? <Link label="Resend" size="small" className="signon-sheet__resend-link" />
            </p>
            <p className="signon-sheet__expires">Code expires in 10 minutes</p>
          </div>
        )}

        <div className="signon-sheet__footer">
          <Button
            variant="primary"
            size="large"
            label="Continue"
            onClick={handleContinue}
            className="signon-sheet__continue w-full"
          />
        </div>
      </div>
    </DeviceFrameSheetPortal>
  );
}

/* ━━━ Google account connect flow (3 bottom sheets) ━━━ */

type GoogleConnectStep = "oauth" | "scanning" | "add-docs";

const NVIDIA_W2_FILE = "W-2_2024_NVIDIA.pdf";

const GOOGLE_SCAN_STEPS = [
  { label: "Scanning email...", kind: "ai" as const },
  { label: "NVIDIA W-2 (2024)", kind: "active" as const },
  { label: "Charity receipt", kind: "active" as const },
  { label: "Childcare invoices", kind: "active" as const },
  { label: "Scan complete", kind: "done" as const },
];

const GOOGLE_IMPORT_DOCS = [
  { id: "nvidia", label: "NVIDIA W-2 (2024)", amount: "Former employer", file: NVIDIA_W2_FILE },
  { id: "charity", label: "Charity donation to AHA", amount: "$800", file: "Charity_donation_AHA.pdf" },
  { id: "childcare", label: "Carmel Mountain preschool", amount: "$9,000", file: "Carmel_Mountain_preschool.pdf" },
];

function gmailIncludesNvidiaW2(files: string[]) {
  return files.some((f) => f.includes("NVIDIA"));
}

function SheetCloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="google-sheet__close" onClick={onClick} aria-label="Close">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>
  );
}

function GoogleToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`google-toggle${on ? "" : " google-toggle--off"}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="google-toggle__knob" />
    </button>
  );
}

function GoogleConnectFlow({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (files: string[]) => void;
}) {
  const [step, setStep] = useState<GoogleConnectStep>("oauth");
  const [gmailOn, setGmailOn] = useState(true);
  const [driveOn, setDriveOn] = useState(true);
  const [scanIdx, setScanIdx] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({
    nvidia: true,
    charity: true,
    childcare: true,
  });

  useEffect(() => {
    if (step !== "scanning") return;
    if (scanIdx < GOOGLE_SCAN_STEPS.length - 1) {
      const id = setTimeout(() => setScanIdx((i) => i + 1), 1100);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setStep("add-docs");
      setScanIdx(0);
    }, 900);
    return () => clearTimeout(id);
  }, [step, scanIdx]);

  const handleClose = () => {
    setStep("oauth");
    setScanIdx(0);
    onClose();
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = () => {
    const files = GOOGLE_IMPORT_DOCS.filter((d) => selectedDocs[d.id]).map((d) => d.file);
    onComplete(files);
  };

  return (
    <DeviceFrameSheetPortal className="connect-scrim" onClick={handleClose}>
      {step === "oauth" && (
        <div
          className="google-sheet google-sheet--oauth"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetCloseBtn onClick={handleClose} />
          <div className="google-sheet__body">
            <div className="google-oauth__logos">
              <span className="google-oauth__tt-badge" aria-hidden>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="14" fill="#D52B1E" />
                  <path d="M8 14.2l3.2 3.2L20 9.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="google-oauth__dots" aria-hidden>•••</span>
              <img className="google-oauth__google-logo" src="images/google.png" alt="" />
            </div>
            <h2 className="google-oauth__title">
              TurboTax wants to access your Google account
            </h2>
            <button type="button" className="google-oauth__account">
              chloe@gmail.com
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <p className="google-oauth__desc">
              TurboTax will scan for tax forms, receipts, and deductible expense, and import only those docs.
            </p>
            <div className="google-oauth__permissions">
              <div className="google-oauth__row">
                <span>Gmail</span>
                <GoogleToggle on={gmailOn} onChange={setGmailOn} />
              </div>
              <div className="google-oauth__row">
                <span>Drive</span>
                <GoogleToggle on={driveOn} onChange={setDriveOn} />
              </div>
              <button type="button" className="google-oauth__row google-oauth__row--expand">
                <span>Additional security</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="google-oauth__privacy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>We&rsquo;ll only use your tax forms. Everything else stays private.</span>
              </div>
            </div>
          </div>
          <div className="google-sheet__footer">
            <Button
              variant="primary"
              size="large"
              label="Connect"
              className="google-sheet__btn w-full"
              onClick={() => {
                setScanIdx(0);
                setStep("scanning");
              }}
            />
          </div>
        </div>
      )}

      {step === "scanning" && (
        <div
          className="google-sheet google-sheet--scan"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetCloseBtn onClick={handleClose} />
          <div className="google-sheet__body google-sheet__body--scan">
            <div className="google-scan__timeline">
              {GOOGLE_SCAN_STEPS.map((item, i) => {
                const active = i <= scanIdx;
                const isDone = item.kind === "done" && active;
                const isAi = item.kind === "ai";
                const showReviewSub =
                  item.label === "NVIDIA W-2 (2024)" && active && scanIdx >= 1 && scanIdx < 2;
                return (
                  <div
                    key={item.label}
                    className={`google-scan__item${active ? " google-scan__item--active" : ""}${isDone ? " google-scan__item--complete" : ""}`}
                  >
                    <div className="google-scan__marker">
                      {isAi && active ? (
                        <IntuitAssistBrand className="google-scan__ai" size={24} />
                      ) : (
                        <span className={`google-scan__dot${isDone ? " google-scan__dot--done" : active ? " google-scan__dot--active" : ""}`} />
                      )}
                    </div>
                    <div className="google-scan__text">
                      <span className="google-scan__label">{item.label}</span>
                      {showReviewSub && (
                        <span className="google-scan__sub">Matching to your 1099-B ESPP sale...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="google-sheet__footer">
            <Button variant="secondary" size="large" label="Cancel" className="google-sheet__btn w-full" onClick={handleClose} />
          </div>
        </div>
      )}

      {step === "add-docs" && (
        <div
          className="google-sheet google-sheet--add-docs"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetCloseBtn onClick={handleClose} />
          <div className="google-sheet__body">
            <h2 className="google-add-docs__title">Add documents</h2>
            <div className="google-add-docs__list">
              {GOOGLE_IMPORT_DOCS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="google-add-docs__row"
                  onClick={() => toggleDoc(doc.id)}
                >
                  <span className="google-add-docs__label">{doc.label}</span>
                  <span className="google-add-docs__amount">{doc.amount}</span>
                  <span className={`google-add-docs__check${selectedDocs[doc.id] ? " google-add-docs__check--on" : ""}`}>
                    {selectedDocs[doc.id] && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="google-sheet__footer google-sheet__footer--stacked">
            <Button variant="primary" size="large" label="Add" className="google-sheet__btn w-full" onClick={handleAdd} />
            <Button variant="secondary" size="large" label="Cancel" className="google-sheet__btn w-full" onClick={handleClose} />
          </div>
        </div>
      )}
    </DeviceFrameSheetPortal>
  );
}

/* ━━━ Side menu (hamburger drawer) ━━━ */

function SideMenu({ skuLabel, onClose, onDocuments, onTaxReturn }: { skuLabel: string; onClose: () => void; onDocuments: () => void; onTaxReturn: () => void }) {
  return (
    <nav className="menu-drawer">
      <div className="menu-drawer__top">
        <p className="menu-drawer__sku-label">{skuLabel}</p>
        <div className="menu-drawer__nav-items">
          <button className="menu-nav-item" onClick={onTaxReturn}>
            <img className="menu-nav-icon" src="images/dashboard-alt.png" alt="" />
            Your 2026 tax return
          </button>
          <button className="menu-nav-item" onClick={onDocuments}>
            <img className="menu-nav-icon" src="images/doc-icon.png" alt="" />
            Documents
          </button>
        </div>
      </div>
      <div className="menu-drawer__section">
        <p className="menu-drawer__section-label">Resume</p>
        <button className="menu-section-item" onClick={onClose}>Deductions &amp; credits</button>
      </div>
      <div className="menu-drawer__section">
        <p className="menu-drawer__section-label">Recents</p>
        <button className="menu-section-item" onClick={onClose}>Your income</button>
        <button className="menu-section-item" onClick={onClose}>Your personal information</button>
      </div>
      <div className="menu-drawer__section">
        <p className="menu-drawer__section-label">Pinned</p>
        <button className="menu-section-item menu-section-item--muted">
          <img className="menu-nav-icon menu-nav-icon--sm" src="images/pin-icon.png" alt="" />
          Drag to pin
        </button>
      </div>
      <div className="menu-drawer__expert-card">
        <img className="menu-expert__avatar-img" src="images/expert-avatar.png" alt="Expert" />
        <div className="menu-expert__text">
          <p className="menu-expert__title">Connect with<br/>an expert</p>
          <p className="menu-expert__sub">We're here to help</p>
        </div>
      </div>
      <div className="menu-drawer__bottom">
        <div className="menu-drawer__avatar-circle">C</div>
        <span className="menu-drawer__switch">
          Switch to Classic mode
          <img className="menu-drawer__undo-icon" src="images/undo.png" alt="" />
        </span>
      </div>
    </nav>
  );
}

/* ━━━ Inline SVG icons ━━━ */

/* ━━━ Hub section icons ━━━ */

function MyInfoIcon() {
  return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="16" height="14" rx="2"/><circle cx="7.5" cy="9" r="2"/><path d="M4.5 14c0-1.7 1.3-3 3-3s3 1.3 3 3"/><path d="M12 8h4M12 11h3"/></svg>);
}
function IncomeIcon() {
  return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="16" height="14" rx="2"/><path d="M2 8h16"/><path d="M6 12h3"/></svg>);
}
function DeductionsIcon() {
  return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2c-1.5 2-5 3-5 6a5 5 0 0010 0c0-3-3.5-4-5-6z"/></svg>);
}
function StateIcon() {
  return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v14h14"/><path d="M7 13V9M11 13V7M15 13V5"/></svg>);
}
function ReviewIcon() {
  return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="14" height="16" rx="2"/><path d="M7 6h6M7 10h6M7 14h3"/></svg>);
}

/* ━━━ Screen 1: SKU_Choice (Figma fY7UyUzTMfHQGze2Jbg7oo / 2903:69513) ━━━ */

const SKU_CHOICE_ASSETS = "images/figma-sku-choice";

/** Full Service FY27 E2E vision — opened from the expert handoff tile on SKU landing. */
const FS_EXPERT_HANDOFF_PROTOTYPE_URL =
  "https://www.figma.com/proto/IMzGbUgclVpDYOwdimiFb3/Full-service-FY27-E2E-vision?page-id=1%3A89213&node-id=68-19069&p=f&viewport=882%2C2036%2C0.1&t=17pzNvE7kYP67N8g-1&scaling=scale-down&content-scaling=fixed&starting-point-node-id=7%3A5137&show-proto-sidebar=1";

function openFsExpertHandoffPrototype() {
  window.open(FS_EXPERT_HANDOFF_PROTOTYPE_URL, "_blank", "noopener,noreferrer");
}

function WelcomeHubScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome-hub" data-node-id="2903:69631">
      <div className="welcome-hub__art" data-node-id="2903:69638">
        <div className="welcome-hub__piggy-scene">
          <div className="welcome-hub__piggy-main" data-node-id="2903:69639">
            <img src="images/welcome-hub/piggy-main.svg" alt="" />
          </div>
          <div className="welcome-hub__piggy-accent" data-node-id="2903:69655">
            <img src="images/welcome-hub/piggy-accent.svg" alt="" />
          </div>
        </div>
      </div>

      <div className="welcome-hub__copy" data-node-id="2903:69671">
        <h1 className="welcome-hub__title" data-node-id="2903:69672">
          Welcome!
        </h1>
        <p className="welcome-hub__body" data-node-id="2903:69673">
          You&apos;re in control, but we&apos;re here to guide you to your maximum refund, every step of the way.
        </p>
      </div>

      <div className="welcome-hub__footer" data-node-id="2903:69674">
        <button type="button" className="welcome-hub__start" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}

function WelcomeChloeOptionIcon({ kind }: { kind: "docs" | "connect" | "explain" }) {
  if (kind === "docs") {
    return (
      <svg className="welcome-chloe__option-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "connect") {
    return (
      <svg className="welcome-chloe__option-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 11l6-3M9 13l6 3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg className="welcome-chloe__option-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h10M4 18h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WelcomeChloeScreen({
  signedIn,
  onMenuOpen,
  onAddDocs,
  onConnect,
  onExplain,
  onExpertUpgrade,
}: {
  signedIn: boolean;
  onMenuOpen: () => void;
  onAddDocs: () => void;
  onConnect: () => void;
  onExplain: () => void;
  onExpertUpgrade?: () => void;
}) {
  const [highlight, setHighlight] = useState<"docs" | "connect" | "explain" | null>(null);

  return (
    <div className="welcome-chloe" data-node-id="2903:69841">
      <DiwmAssistedToolbar
        variant="l0"
        showTitleRow
        hideVignetteLabel={!signedIn}
        onMenuOpen={onMenuOpen}
        onHubOpen={() => {}}
      />

      <div className="welcome-chloe__scroll">
        <div className="welcome-chloe__intro" data-node-id="2903:69845">
          <h1 className="welcome-chloe__greeting" data-node-id="2903:69846">
            Hi, Chloe.
          </h1>
          <p className="welcome-chloe__lede" data-node-id="2903:69847">
            I&apos;m your AI tax assistant. I&apos;ll help you get your maximum refund — and you can get expert help
            anytime.
          </p>
        </div>

        <p className="welcome-chloe__prompt" data-node-id="2903:69848">
          How do you want to get started?
        </p>

        <div className="welcome-chloe__options" data-node-id="2903:69849">
          <ChoiceTile
            label="Explain my situation"
            description="Tell me about your taxes in your own words"
            icon={<WelcomeChloeOptionIcon kind="explain" />}
            showImage={false}
            selected={highlight === "explain"}
            onClick={() => {
              setHighlight("explain");
              onExplain();
            }}
            className="welcome-chloe__choice-tile"
          />
          <ChoiceTile
            label="Add my tax docs"
            description="Upload or import W-2s, 1099s, and more"
            icon={<WelcomeChloeOptionIcon kind="docs" />}
            showImage={false}
            selected={highlight === "docs"}
            onClick={() => {
              setHighlight("docs");
              onAddDocs();
            }}
            className="welcome-chloe__choice-tile"
          />
          <ChoiceTile
            label="Connect my accounts"
            description="Import income and deductions automatically"
            icon={<WelcomeChloeOptionIcon kind="connect" />}
            showImage={false}
            selected={highlight === "connect"}
            onClick={() => {
              setHighlight("connect");
              onConnect();
            }}
            className="welcome-chloe__choice-tile"
          />
        </div>
      </div>

      <div className="welcome-chloe__footer">
        <DiwmPreMatchExpertComposer onAddExpertAssist={onExpertUpgrade} />
      </div>
    </div>
  );
}

function LandingScreen({
  onGetStarted,
  onSignIn,
  onMenuOpen,
}: {
  onGetStarted: () => void;
  onSignIn: () => void;
  onMenuOpen: () => void;
}) {
  const [choice, setChoice] = useState<SkuLandingChoice | null>(null);

  const handleGetStarted = () => {
    if (choice === "expert") {
      openFsExpertHandoffPrototype();
      return;
    }
    if (choice === "diy") onGetStarted();
  };

  return (
    <div className="screen screen--sku-landing">
      <div className="sku-choice" data-name="SKU_Choice" data-node-id="2903:69513">
        <DiwmSkuToolbar onMenuOpen={onMenuOpen} onSignIn={onSignIn} />

        <div className="sku-choice__body" data-node-id="2903:69543">
          <div className="sku-choice__stack" data-node-id="2903:69544">
            <section
              className="sku-choice__hero"
              aria-labelledby="landing-sku-headline"
              data-node-id="2903:69545"
            >
              <img
                className="sku-choice__hero-img"
                src={`${SKU_CHOICE_ASSETS}/hero-full.png`}
                alt=""
                data-node-id="2903:69546"
              />
              <h1 id="landing-sku-headline" className="sku-choice__hero-title" data-node-id="2903:69550">
                Your biggest refund, backed by local experts
              </h1>
              <p className="sku-choice__hero-sub" data-node-id="2903:69551">
                We make it fast and easy to get your taxes done 100% right,{" "}
                <span className="sku-choice__hero-guaranteed">guaranteed</span>.
              </p>
            </section>

            <div className="sku-choice__card-wrap" data-node-id="2903:69552">
              <SkuLandingChoiceTile
                className="sku-choice__expert-tile"
                label="Hand off to a local expert"
                summary="They do it all, start to finish."
                pricing="Starting from $199, pay only when you file."
                selected={choice === "expert"}
                onClick={() => {
                  setChoice("expert");
                  openFsExpertHandoffPrototype();
                }}
              />
              <span className="sku-choice__badge sku-choice__tile-badge">Saves time</span>
            </div>

            <SkuLandingChoiceTile
              label="Do it myself"
              summary="AI-powered, with an option to get expert help."
              pricing="Starting from $89, pay only when you file."
              selected={choice === "diy"}
              onClick={() => setChoice("diy")}
              data-node-id="2903:69562"
            />

            <DiwmPrimaryButton
              label="Get started"
              onClick={handleGetStarted}
              disabled={!choice}
              className="sku-choice__cta w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━ Hub screen ━━━ */

function HubScreen({ onBack, progress, docsUploaded }: { onBack: () => void; progress: number; docsUploaded: boolean }) {
  const sections = [
    { label: "My info", icon: <MyInfoIcon />, pct: docsUploaded ? 30 : 0, hasChevron: true, tint: docsUploaded },
    { label: "Income", icon: <IncomeIcon />, pct: docsUploaded ? 35 : 0, hasChevron: true, tint: docsUploaded },
    { label: "Deductions & credits", icon: <DeductionsIcon />, pct: 0, hasChevron: false, tint: false },
    { label: "State", icon: <StateIcon />, pct: 0, hasChevron: false, tint: false },
    { label: "Review & file", icon: <ReviewIcon />, pct: 0, hasChevron: false, tint: false },
  ];

  return (
    <div className="screen">
      <DiwmBackToolbar onBack={onBack} />
      <div className="hub-progress-bar"><div className="hub-progress-bar__fill" style={{ width: `${progress}%` }} /></div>
      <div className="screen__scroll">
        <Tabs
          className="hub-tabs"
          tabs={[
            { id: "taxes", label: "Taxes" },
            { id: "tools", label: "Tools" },
          ]}
          activeTab="taxes"
          onTabChange={() => {}}
        />
        <div className="hub-refunds">
          <div className="hub-refund"><span className="hub-refund__label">Federal refund</span><span className="hub-refund__amount">$5,154</span></div>
          <div className="hub-refund"><span className="hub-refund__label">State refund</span><span className="hub-refund__amount">$2,340</span></div>
        </div>
        <div className="hub-sections">
          {sections.map((s) => (
            <button key={s.label} className={`hub-section-card${s.tint ? " hub-section-card--tint" : ""}`}>
              <span className="hub-section-card__icon">{s.icon}</span>
              <span className="hub-section-card__label">{s.label}</span>
              {s.pct > 0 && (<span className="hub-section-card__bar"><span className="hub-section-card__bar-fill" style={{ width: `${s.pct}%` }} /></span>)}
              {s.hasChevron && (<svg className="hub-section-card__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4"/></svg>)}
            </button>
          ))}
        </div>
      </div>
      <div className="hub-bottom-bar">
        <Button variant="secondary" size="small" label="Add anything" className="hub-add-btn w-full" />
      </div>
    </div>
  );
}

/* ━━━ Stub screen ━━━ */

/* ━━━ Expert match card (1 of 2 / 2 of 2) ━━━ */

const WORK_PREFS = ["In person", "Phone call", "Video call", "Chat only", "No preference"];

function ExpertMatchCard({
  step,
  onNext,
  onPrev,
}: {
  step: 1 | 2;
  onNext: () => void;
  onSkip: () => void;
  onPrev?: () => void;
}) {
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [editCity, setEditCity] = useState("Seattle");
  const [editSkills, setEditSkills] = useState("W-2 and stocks");
  const [city, setCity] = useState("Seattle");
  const [skills, setSkills] = useState("W-2 and stocks");

  const togglePref = (p: string) => {
    setSelectedPrefs((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const startEdit = () => {
    setEditCity(city);
    setEditSkills(skills);
    setEditing(true);
  };

  const saveEdit = () => {
    setCity(editCity);
    setSkills(editSkills);
    setEditing(false);
  };

  return (
    <div className="expert-card etrade-flow--fade-in" key={step}>
      <div className="expert-card__body">
        {step === 1 ? (
          editing ? (
            <div className="expert-card__edit-form">
              <label className="expert-card__edit-label">Location</label>
              <input
                className="expert-card__edit-input"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
              <label className="expert-card__edit-label">Experience</label>
              <input
                className="expert-card__edit-input"
                value={editSkills}
                onChange={(e) => setEditSkills(e.target.value)}
              />
              <div className="expert-card__edit-actions">
                <button className="expert-card__edit-cancel" onClick={() => setEditing(false)}>Cancel</button>
                <button className="expert-card__edit-save" onClick={saveEdit}>Save</button>
              </div>
            </div>
          ) : (
            <>
              <p className="expert-card__sentence">
                I&rsquo;m looking for a expert in{" "}
                <span className="expert-card__underline" onClick={startEdit}>{city}</span> who has experience in{" "}
                <span className="expert-card__underline" onClick={startEdit}>{skills}</span>.
              </p>
              <svg className="expert-card__edit" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" onClick={startEdit} style={{ cursor: "pointer" }}>
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <div className="expert-card__prefilled">
                <IntuitAssistBrand
                  className="intuit-ai-icon intuit-ai-icon--sm"
                  size={16}
                />
                <span>Pre-filled based on your info</span>
              </div>
            </>
          )
        ) : (
          <>
            <h3 className="expert-card__q">Great. How do you prefer to work with an expert?</h3>
            <p className="expert-card__hint">Select all that apply.</p>
            <div className="explain-card__pills">
              {WORK_PREFS.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  className={`explain-pill${selectedPrefs.includes(pref) ? " explain-pill--on" : ""}`}
                  onClick={() => togglePref(pref)}
                >
                  {pref}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="expert-card__footer">
        <div className="expert-card__pagination">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={step === 1 ? "#CCC" : "#333"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ cursor: step === 2 ? "pointer" : "default" }}
            onClick={step === 2 && onPrev ? onPrev : undefined}
          >
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span>{step} of 2</span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={step === 2 ? "#CCC" : "#333"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ cursor: step === 1 ? "pointer" : "default" }}
            onClick={step === 1 ? onNext : undefined}
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
        <div className="expert-card__actions">
          <Button variant="secondary" size="small" label="Skip" className="expert-card__skip" onClick={onNext} />
          <Button variant="primary" size="small" label="Next" className="expert-card__next" onClick={onNext} />
        </div>
      </div>
    </div>
  );
}

/* ━━━ Share docs screen (after explain pills) ━━━ */

/** User reply pills after "How would you like to share your docs?" (Upload / Connect / Camera) */
type ShareDocsActionReply = {
  id: string;
  label: string;
};

function ShareDocsUserReplyPill({ label }: { label: string }) {
  return (
    <div className="share-docs__chosen share-docs__chosen--fade-in">
      <span className="chosen-chip">{label}</span>
    </div>
  );
}

function buildInitialShareDocsActionReplies(initialStage: number): ShareDocsActionReply[] {
  if (initialStage >= 5) {
    return [{ id: "upload", label: "Upload" }];
  }
  return [];
}

const SHARE_MSG_1 = "Here\u2019s what you told me:";
const SHARE_MSG_2 =
  "I need your income to confirm a few things. Connecting your accounts is the fastest way to share, but pick whichever is easiest for you.";
const SHARE_MSG_3 = "How would you like to share your docs?";

const DOC_CARDS = [
  {
    name: "Clover W-2",
    reviewTitle: "W-2 Review",
    reviewSubtitle: "Clover W-2",
    amount: "$42,500 in wages",
    detail: "You already withheld $8,560 in taxes.",
    bg: "#F0AAFF",
    fg: "#4A0E4E",
    lines: [
      { n: 1, label: "Wages, tips, other comp.", value: "$42,500.00" },
      { n: 2, label: "Federal income tax withheld", value: "$8,560.00" },
      { n: 3, label: "Social security wages", value: "$42,500.00" },
      { n: 4, label: "Social security withheld", value: "$2,635.00" },
      { n: 5, label: "Medicare wages and tips", value: "$42,500.00" },
      { n: 6, label: "Medicare tax withheld", value: "$616.25" },
      { n: 7, label: "Social security tips", value: "---" },
      { n: 8, label: "Allocated tips", value: "---" },
      { n: 9, label: "Reserved", value: "---" },
      { n: 10, label: "Dependent care benefits", value: "---" },
    ],
  },
  {
    name: "1099 Capital Partners",
    reviewTitle: "1099-DIV Review",
    reviewSubtitle: "Capital Partners 1099-DIV",
    amount: "$3,200 in dividends",
    detail: "Qualified dividends: $2,800.",
    bg: "#C9FF98",
    fg: "#1B5E20",
    lines: [
      { n: 1, label: "Total ordinary dividends", value: "$3,200.00" },
      { n: 2, label: "Qualified dividends", value: "$2,800.00" },
      { n: 3, label: "Total capital gain distr.", value: "$400.00" },
      { n: 4, label: "Unrecap. Sec. 1250 gain", value: "---" },
      { n: 5, label: "Section 199A dividends", value: "---" },
      { n: 6, label: "Investment expenses", value: "---" },
      { n: 7, label: "Foreign tax paid", value: "$12.50" },
      { n: 8, label: "Foreign country", value: "Various" },
    ],
  },
  {
    name: "2025 Tax Return",
    reviewTitle: "1040 Review",
    reviewSubtitle: "2025 Form 1040",
    amount: "$1,040 refund filed",
    detail: "Federal return accepted 3/15/2025.",
    bg: "#FFE082",
    fg: "#5D4037",
    lines: [
      { n: 1, label: "Filing status", value: "Single" },
      { n: 2, label: "Total income", value: "$38,750.00" },
      { n: 3, label: "Adjusted gross income", value: "$38,750.00" },
      { n: 4, label: "Standard deduction", value: "$14,600.00" },
      { n: 5, label: "Taxable income", value: "$24,150.00" },
      { n: 6, label: "Total tax", value: "$2,720.00" },
      { n: 7, label: "Total payments", value: "$3,760.00" },
      { n: 8, label: "Refund", value: "$1,040.00" },
    ],
  },
];

const UPLOADED_DOCS = [
  "W-2-2026_clover.pdf",
  "1099_2026_cp.pdf",
  "2025_Taxes_1040_CGreen.pdf",
];

const UPLOAD_FETCH_STEPS = [
  "Importing info from W-2",
  "Importing info from 1099-B",
  "Importing info from 1040",
];

const ETRADE_FETCH_STEPS = ["Looking for stock sales", "Document found"];

const BEN_INTRO_MESSAGE =
  "Hey Chloe! I'm Ben, your tax expert. I'll be here to guide you through everything—and I've got a team helping behind the scenes to make sure you get the best outcome. Since I'm just jumping in here, what do you want to do next?";

const BEN_COST_BASIS_OPEN =
  "Chatting works! I noticed you're having some difficulties with the cost basis on your 1099-B.";

const CHLOE_ESPP_MESSAGE =
  "Yes, I'm trying to resolve the ESPPs I sold from a job 2 years ago.";

const BEN_ADJUSTED_BASIS_MESSAGE =
  "Nice catch! Brokers frequently report just the out-of-pocket cost in Box 1e of the 1099-B. To obtain the correct amount, you'll need the higher \u201cadjusted\u201d basis. For that, you'll have to get a W-2 from your former employer\u2014seems like Nvidia, based on the 1099-B I'm reviewing.";

const BEN_ACCESS_QUESTION = "Do you happen to have access to this?";

const CHLOE_GMAIL_MESSAGE = "Actually, yes. I think it's in my gmail.";

const BEN_GMAIL_PERMISSION_MESSAGE =
  "Great. Can I have permission to access your email to get it? With filers like you, we often uncover more tax savings through email.";

const BEN_GMAIL_IMPORT_SUCCESS_P1 =
  "Perfect \u2014 I pulled the Nvidia W-2 from your Gmail. We were able to resolve the ESPP cost basis and added them to your return.";

const BEN_GMAIL_IMPORT_SUCCESS_P2 =
  "I also added $9,800 in additional deductions from other documents found.";

const BEN_GMAIL_SKIP_IMPORT_MESSAGE =
  "No problem \u2014 let\u2019s keep working on your ESPP cost basis in chat.";

const BEN_CHAT_WRAPUP_MESSAGE =
  "We have what we need for now, so I'll wrap up this chat. I'm always around if you need help later. Just tap 'Ask Ben' at the bottom of the screen anytime you need me.";

/** Available-now badge PNG at design export size — keep in sync with public/images/available-now-pill.png */
const STATUS_PILL_AVAILABLE_PX = { w: 108, h: 26 } as const;
function StatusPillAvailable() {
  return (
    <img
      src="images/available-now-pill.png"
      alt="Available now"
      className="status-pill-img status-pill-img--available"
      width={STATUS_PILL_AVAILABLE_PX.w}
      height={STATUS_PILL_AVAILABLE_PX.h}
    />
  );
}

function BenSessionEnded() {
  return (
    <div className="ben-session-ended etrade-flow--fade-in" role="status" aria-live="polite">
      <span className="ben-session-ended__line" aria-hidden />
      <img src="images/ben.png" alt="" className="ben-session-ended__avatar" />
      <span className="ben-session-ended__text">Ben has left the chat</span>
      <span className="ben-session-ended__line" aria-hidden />
    </div>
  );
}

function FetchingProgress({
  steps,
  visibleCount,
  title = "Fetching",
  className = "",
}: {
  steps: string[];
  visibleCount: number;
  title?: string;
  className?: string;
}) {
  const shown = steps.slice(0, visibleCount);
  return (
    <div className={`fetch-progress${className ? ` ${className}` : ""}`}>
      <div className="fetch-progress__header">
        <IntuitAssistBrand className="fetch-progress__sparkle" size={24} />
        <span className="fetch-progress__title">{title}</span>
      </div>
      {shown.length > 0 && (
        <div className="fetch-progress__steps">
          {shown.map((step) => (
            <div key={step} className="fetch-progress__step">
              <span className="fetch-progress__bullet" aria-hidden />
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareDocsScreen({
  initialStage,
  onStageChange,
  onPostCallPhaseChange,
  onScheduleStepChange,
  previewMode = false,
  postCallCoverage = "all-covered",
  postCallPreview = false,
  postCallSkipToChecks = false,
  postCallPreviewPhase,
  postCallPreviewExpertReview = false,
  postCallSchedulePhase = null,
  appointmentUpcoming = null,
  onAppointmentUpcomingChange,
  previewScheduleStep = null,
  smsLockOpen = false,
  onSmsLockOpenChange,
  gmailImportedFiles,
  onGmailImported,
  onEdit,
  onMenuOpen,
  onHubOpen,
  progress,
  onDocsUploaded,
  onProviderSignIn,
  onTaxStory,
  explainSelection,
  chatVisible = true,
}: {
  initialStage: number;
  /** Report the chat stage upward so the parent can mirror it into the URL for deep links. */
  onStageChange?: (stage: number) => void;
  /** Report the post-wrap-up phase upward so the parent can keep tracking the current step. */
  onPostCallPhaseChange?: (phase: PostCallPhase) => void;
  /** Report the schedule-sheet step (or null when closed) for "Jump to…" tracking. */
  onScheduleStepChange?: (step: "calendar" | "confirmed" | null) => void;
  previewMode?: boolean;
  postCallCoverage?: PostCallCoverageOutcome;
  postCallPreview?: boolean;
  postCallSkipToChecks?: boolean;
  postCallPreviewPhase?: PostCallPhase;
  postCallPreviewExpertReview?: boolean;
  postCallSchedulePhase?: "booked" | "declined" | null;
  appointmentUpcoming?: ScheduledAppointment | null;
  onAppointmentUpcomingChange?: (appointment: ScheduledAppointment | null) => void;
  /** Deep-link preview: open the schedule sheet on mount at the given step. */
  previewScheduleStep?: "calendar" | "confirmed" | null;
  smsLockOpen?: boolean;
  onSmsLockOpenChange?: (open: boolean) => void;
  gmailImportedFiles: string[];
  onGmailImported: (files: string[]) => void;
  onEdit: (stage: number) => void;
  onMenuOpen: () => void;
  onHubOpen: () => void;
  progress: number;
  onDocsUploaded: () => void;
  onProviderSignIn: () => void;
  onTaxStory: () => void;
  explainSelection: ExplainSelection;
  chatVisible?: boolean;
}) {
  const summary = buildExplainSummary(explainSelection);
  /* Stages 9–10 were the removed “follow-up question” gate; resume at E*Trade content. */
  const resumeStage = initialStage === 9 || initialStage === 10 ? 11 : initialStage;
  const previewPreset = getShareDocsInitialState(resumeStage);
  const [stage, setStage] = useState<number>(resumeStage);
  /* Forward-only advance for auto-driven transitions (StreamText.onDone, timers). Guards
     against a deep-linked mount: messages above the resume point mount fresh and would
     otherwise re-fire their onDone and yank the stage backward. Explicit user navigation
     (e.g. the match questionnaire's Back) still uses setStage directly. */
  const advanceStage = useCallback((to: number) => {
    setStage((s) => (to > s ? to : s));
  }, []);
  /* A message that finished before the resume point renders instantly (no re-typing);
     the resume point onward streams live. */
  const streamInstant = (advancesTo: number) => previewMode || resumeStage >= advancesTo;
  const [visibleDocs, setVisibleDocs] = useState(previewPreset.visibleDocs);
  const [uploadFetchStep, setUploadFetchStep] = useState(previewPreset.uploadFetchStep);
  const [activeCard, setActiveCard] = useState(0);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const scrollToDocCard = useCallback((index: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setActiveCard(index);
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatContentRef = useRef<HTMLDivElement>(null);
  /* Whether the chat should stay glued to the bottom — true while the user is near the
     bottom, set false if they scroll up so auto-scroll never fights manual scrolling. */
  const stickToBottomRef = useRef(true);
  /* Keep the latest chat content in view as the post-wrap-up flow auto-advances
     (PostCallFlow drives its own phases, so stage-based scroll effects don't fire). */
  const scrollChatToBottom = useCallback(() => {
    stickToBottomRef.current = true;
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 140);
  }, []);
  const [connectSheet, setConnectSheet] = useState(false);
  const [connectFilled, setConnectFilled] = useState(previewPreset.connectFilled);
  const [fetchSheet, setFetchSheet] = useState(false);
  const [fetchStep, setFetchStep] = useState(0);
  const [importStep, setImportStep] = useState(previewPreset.importStep);
  const [addDocsSheet, setAddDocsSheet] = useState(false);
  const [addDocsChecked, setAddDocsChecked] = useState(true);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [benProfile, setBenProfile] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [expertUpgradeOpen, setExpertUpgradeOpen] = useState(false);
  const [googleConnectOpen, setGoogleConnectOpen] = useState(false);
  const [googleConnectChosen, setGoogleConnectChosen] = useState(previewPreset.googleConnectChosen);
  const [keepGoingChosen, setKeepGoingChosen] = useState(previewPreset.keepGoingChosen || postCallPreview);
  const [welcomeCallChosen, setWelcomeCallChosen] = useState(false);
  const [deductionsChoice, setDeductionsChoice] = useState<null | "review" | "skip">(
    previewPreset.deductionsChoice ?? (postCallPreview ? "skip" : null),
  );
  const [gmailBenPara, setGmailBenPara] = useState(previewPreset.gmailBenPara);
  const [benWrapUpDone, setBenWrapUpDone] = useState(previewPreset.benWrapUpDone || postCallPreview);
  const [uploadChosen, setUploadChosen] = useState(previewPreset.uploadChosen);
  const [shareDocsActionReplies, setShareDocsActionReplies] = useState<ShareDocsActionReply[]>(
    () =>
      previewPreset.shareDocsActionReplies.length > 0
        ? previewPreset.shareDocsActionReplies
        : buildInitialShareDocsActionReplies(resumeStage),
  );
  const [providerConnectOpen, setProviderConnectOpen] = useState(false);
  const [expertMatchPhase, setExpertMatchPhase] = useState<ExpertMatchPhase | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const appendShareDocsActionReply = useCallback((label: string) => {
    setShareDocsActionReplies((prev) => {
      if (prev.some((r) => r.label === label)) return prev;
      return [...prev, { id: `share-docs-action-${prev.length}`, label }];
    });
  }, []);

  /** Persist gray user pill, then run the tile's existing side effect (upload flow, sheet, camera). */
  const handleShareDocsActionTile = useCallback(
    (label: string, run: () => void) => {
      appendShareDocsActionReply(label);
      run();
    },
    [appendShareDocsActionReply],
  );
  const [scheduleCallOpen, setScheduleCallOpen] = useState(previewScheduleStep != null);

  /* When the schedule sheet closes, clear the parent's tracked step. */
  useEffect(() => {
    if (!scheduleCallOpen) onScheduleStepChange?.(null);
  }, [scheduleCallOpen, onScheduleStepChange]);

  const setAppointmentUpcoming = useCallback(
    (appointment: ScheduledAppointment | null) => {
      onAppointmentUpcomingChange?.(appointment);
    },
    [onAppointmentUpcomingChange],
  );
  const [welcomeScheduleDismissed, setWelcomeScheduleDismissed] = useState(false);
  const [welcomeCallBookedAppointment, setWelcomeCallBookedAppointment] =
    useState<ScheduledAppointment | null>(null);
  const openAppointmentSmsLock = useCallback(() => {
    onSmsLockOpenChange?.(true);
  }, [onSmsLockOpenChange]);
  const closeAppointmentSmsLock = useCallback(() => {
    onSmsLockOpenChange?.(false);
  }, [onSmsLockOpenChange]);
  const scheduleCallHandlersRef = useRef<ScheduleCallHandlers | null>(null);
  const persistedScheduleHandlersRef = useRef<ScheduleCallHandlers | null>(null);

  const openScheduleCall = useCallback((handlers?: ScheduleCallHandlers) => {
    scheduleCallHandlersRef.current = handlers ?? null;
    if (handlers) persistedScheduleHandlersRef.current = handlers;
    /* Defer one frame so the opening tap cannot hit the scrim and dismiss immediately. */
    window.setTimeout(() => setScheduleCallOpen(true), 0);
  }, []);

  const composerExpertInteraction = resolveShareDocsComposerExpertInteraction(stage);
  const openExpertUpgrade = useCallback(() => setExpertUpgradeOpen(true), []);
  const closeExpertUpgrade = useCallback(() => setExpertUpgradeOpen(false), []);
  const acceptExpertUpgrade = useCallback(() => {
    setExpertUpgradeOpen(false);
    if (stage < 20) setStage(20);
  }, [stage]);

  const closeScheduleBooked = useCallback((appointment: ScheduledAppointment) => {
    setScheduleCallOpen(false);
    const handlers = scheduleCallHandlersRef.current;
    handlers?.onBooked?.(appointment);

    const welcomeCallOnly = !benWrapUpDone && stage >= 29 && !handlers;
    if (welcomeCallOnly) {
      setWelcomeCallBookedAppointment(appointment);
      setWelcomeScheduleDismissed(false);
    } else {
      setAppointmentUpcoming(appointment);
    }
    scheduleCallHandlersRef.current = null;
  }, [benWrapUpDone, stage, setAppointmentUpcoming]);

  const handleEditUpcomingAppointment = useCallback(() => {
    closeAppointmentSmsLock();
    setAppointmentUpcoming(null);
    scheduleCallHandlersRef.current = persistedScheduleHandlersRef.current;
    setScheduleCallOpen(true);
  }, [closeAppointmentSmsLock]);

  const closeScheduleDismissed = useCallback(() => {
    setScheduleCallOpen(false);
    if (welcomeCallChosen && !keepGoingChosen) {
      setWelcomeScheduleDismissed(true);
    }
    scheduleCallHandlersRef.current?.onDismissed?.();
    scheduleCallHandlersRef.current = null;
  }, [welcomeCallChosen, keepGoingChosen]);

  useEffect(() => {
    if (previewMode) return;
    if (uploadChosen && stage < 5) {
      const id = setTimeout(() => setStage(5), 700);
      return () => clearTimeout(id);
    }
  }, [previewMode, uploadChosen, stage]);

  useEffect(() => {
    if (stage >= 7 || googleConnectOpen || gmailImportedFiles.length > 0) {
      const id = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
      return () => clearTimeout(id);
    }
  }, [stage, googleConnectOpen, gmailImportedFiles.length]);

  useEffect(() => {
    if (!welcomeCallBookedAppointment) return;
    const id = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 120);
    return () => clearTimeout(id);
  }, [welcomeCallBookedAppointment]);

  useEffect(() => {
    if (previewMode) return;
    if (stage === 0) {
      const id = setTimeout(() => setStage(1), 300);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* PDF upload: sequential Fetching header + steps, then doc chips */
  useEffect(() => {
    if (previewMode) return;
    if (stage !== 5 || uploadFetchStep >= UPLOAD_FETCH_STEPS.length) return;
    const delay = uploadFetchStep === 0 ? 500 : 1400;
    const id = setTimeout(() => setUploadFetchStep((s) => s + 1), delay);
    return () => clearTimeout(id);
  }, [previewMode, stage, uploadFetchStep]);

  useEffect(() => {
    if (previewMode) return;
    if (stage === 5 && uploadFetchStep >= UPLOAD_FETCH_STEPS.length) {
      const id = setTimeout(() => {
        setVisibleDocs(UPLOADED_DOCS.length);
        setStage(7);
      }, 800);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage, uploadFetchStep]);

  /* After carousel shows, auto-advance to E*Trade / Chase income thread */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 8) {
      const id = setTimeout(() => setStage(11), 1500);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* Desktop: click-drag to scroll doc review carousel (touch uses native pan-x). */
  useEffect(() => {
    if (stage < 8) return;
    const el = carouselRef.current;
    if (!el) return;

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      if ((e.target as HTMLElement).closest(".doc-review-card__btn")) return;
      dragging = true;
      startX = e.clientX;
      startScrollLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.classList.add("doc-carousel--dragging");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      el.scrollLeft = startScrollLeft - (e.clientX - startX);
    };

    const finishDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("doc-carousel--dragging");
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", finishDrag);
    el.addEventListener("pointercancel", finishDrag);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", finishDrag);
      el.removeEventListener("pointercancel", finishDrag);
    };
  }, [stage]);

  /* After "Fetched" chip appears, advance to importing */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 13) {
      const id = setTimeout(() => setStage(14), 1000);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* After importing done, show Add Docs sheet */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 15) {
      const id = setTimeout(() => setAddDocsSheet(true), 600);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* After chat playback, auto-advance to expert match animation */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 23) {
      const id = setTimeout(() => setStage(24), 1500);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  useEffect(() => {
    if (stage === 24) {
      setExpertMatchPhase("inChat");
    } else {
      setExpertMatchPhase(null);
    }
  }, [stage]);

  /* After matched card appears, stream price text */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 25) {
      const id = setTimeout(() => setStage(26), 1200);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* After bullet points, show price card */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 27) {
      const id = setTimeout(() => setStage(28), 800);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* After price card, show "Ben added" banner */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 28) {
      const id = setTimeout(() => setStage(29), 2000);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  /* Keep-going thread: pause between turns, then auto-advance */
  useEffect(() => {
    if (previewMode) return;
    if (stage === 33 && keepGoingChosen) {
      const id = setTimeout(() => setStage(34), 700);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage, keepGoingChosen]);

  useEffect(() => {
    if (previewMode) return;
    if (stage === 35) {
      const id = setTimeout(() => setStage(36), 1000);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  useEffect(() => {
    if (previewMode) return;
    if (stage === 38) {
      const id = setTimeout(() => setStage(39), 1000);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage]);

  useEffect(() => {
    if (stage >= 33 && stage <= 46) {
      const id = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 120);
      return () => clearTimeout(id);
    }
  }, [stage, googleConnectOpen, gmailImportedFiles.length, googleConnectChosen, deductionsChoice, benWrapUpDone]);

  /* Mirror the chat stage into the URL for deep links — also re-sync when the chat
     becomes visible again (the stage may have advanced while it was hidden). */
  useEffect(() => {
    if (!chatVisible) return;
    onStageChange?.(stage);
  }, [stage, chatVisible, onStageChange]);

  /* Returning to the chat (e.g. back from the deductions screen): scroll to the latest message.
     The wrap-up advances while the chat is hidden, so scrollIntoView no-ops then — re-run on show. */
  useEffect(() => {
    if (!chatVisible) return;
    const id = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 160);
    return () => clearTimeout(id);
  }, [chatVisible, stage, benWrapUpDone, deductionsChoice]);

  /* Track whether the user is near the bottom; if they scroll up, stop auto-pinning. */
  useEffect(() => {
    const area = scrollAreaRef.current;
    if (!area) return;
    const onScroll = () => {
      const distanceFromBottom =
        area.scrollHeight - area.scrollTop - area.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 80;
    };
    area.addEventListener("scroll", onScroll, { passive: true });
    return () => area.removeEventListener("scroll", onScroll);
  }, []);

  /* During the post-wrap-up flow, animations (transcribing, running checks, refund) grow
     in height after their phase starts. Pin the chat to the bottom as the content expands —
     but only while the user is already at the bottom, so manual scroll-up is respected. */
  useEffect(() => {
    if (!benWrapUpDone) return;
    const area = scrollAreaRef.current;
    const content = chatContentRef.current;
    if (!area || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        area.scrollTop = area.scrollHeight;
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [benWrapUpDone]);

  /* After Chloe taps Skip — or returns from reviewing deductions — brief pause then Ben wrap-up.
     For the review path, hold at stage 45 until the chat is visible again so the wrap-up
     streams from the start on return, instead of completing while the chat is hidden. */
  useEffect(() => {
    if (previewMode) return;
    if ((deductionsChoice !== "skip" && deductionsChoice !== "review") || stage !== 45) return;
    if (deductionsChoice === "review" && !chatVisible) return;
    const id = setTimeout(() => setStage(46), 500);
    return () => clearTimeout(id);
  }, [previewMode, deductionsChoice, stage, chatVisible]);

  /* E*Trade fetch sheet: same sequential reveal as PDF upload */
  useEffect(() => {
    if (!fetchSheet) return;
    if (fetchStep < ETRADE_FETCH_STEPS.length) {
      const delay = fetchStep === 0 ? 500 : 1400;
      const id = setTimeout(() => setFetchStep((s) => s + 1), delay);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setFetchSheet(false);
      setFetchStep(0);
      setStage(13);
    }, 800);
    return () => clearTimeout(id);
  }, [fetchSheet, fetchStep]);

  /* Import animation: step through 3 bullet items */
  const IMPORT_STEPS = [
    "Matching transactions to 1099-B",
    "Reviewing cost basis for shares",
    "Ready for review",
  ];
  useEffect(() => {
    if (previewMode) return;
    if (stage === 14 && importStep < IMPORT_STEPS.length) {
      const id = setTimeout(() => setImportStep((s) => s + 1), 1200);
      return () => clearTimeout(id);
    }
    if (stage === 14 && importStep >= IMPORT_STEPS.length) {
      const id = setTimeout(() => setStage(15), 800);
      return () => clearTimeout(id);
    }
  }, [previewMode, stage, importStep, IMPORT_STEPS.length]);

  const handleUpload = () => {
    handleShareDocsActionTile("Upload", () => {
      setUploadPickerOpen(true);
    });
  };

  const handleUploadPickerDone = () => {
    setUploadPickerOpen(false);
    setUploadFetchStep(0);
    setVisibleDocs(0);
    setUploadChosen(true);
    onDocsUploaded();
  };

  const handleSkipDocs = () => {
    setStage(7);
  };

  return (
    <div
      ref={screenRef}
      className={`screen${appointmentUpcoming ? " screen--appointment-upcoming" : ""}${scheduleCallOpen || benProfile || smsLockOpen || uploadPickerOpen ? " screen--modal-open" : ""}${stage === 24 && expertMatchPhase && expertMatchPhase !== "inChat" ? " screen--expert-match-fullscreen" : ""}`}
    >
      {appointmentUpcoming && smsLockOpen ? null : (
        <DiwmAssistedToolbar
          variant="l0"
          showTitleRow
          title="Chloe's 2026 taxes"
          progress={progress}
          onMenuOpen={onMenuOpen}
          onHubOpen={onHubOpen}
        />
      )}
      <div
        ref={scrollAreaRef}
        className={`screen__scroll${appointmentUpcoming ? " screen__scroll--appointment" : ""}`}
      >
        {appointmentUpcoming ? (
          <div className="appointment-upcoming-layout">
            <AppointmentUpcomingScreen
              appointment={appointmentUpcoming}
              onEditAppointment={handleEditUpcomingAppointment}
              onWhatToHaveReady={() => {
                /* TODO: readiness checklist sheet */
              }}
            />
            {!smsLockOpen && (
              <button
                type="button"
                className="appointment-upcoming__continue"
                onClick={openAppointmentSmsLock}
              >
                Continue
              </button>
            )}
          </div>
        ) : (
        <div ref={chatContentRef} className="share-docs__chat">
          {stage >= 1 && (
            <StreamText
              instant={streamInstant(2)}
              text={SHARE_MSG_1}
              as="p"
              className="share-docs__intro"
              msPerWord={70}
              onDone={() => advanceStage(2)}
            />
          )}

          {stage >= 2 && (
            <div className="share-docs__summary-card share-docs__summary-card--fade-in">
              <div className="share-docs__summary-section">
                <p className="share-docs__summary-label">Your household</p>
                <p className="share-docs__summary-value">{summary.household}</p>
              </div>
              <div className="share-docs__summary-section">
                <p className="share-docs__summary-label">Your income</p>
                <p className="share-docs__summary-value">{summary.income}</p>
              </div>
              <div className="share-docs__summary-edit-row">
                <Link label="Edit" size="small" className="share-docs__edit-btn" onClick={() => onEdit(stage)} />
              </div>
            </div>
          )}

          {stage >= 2 && (
            <StreamText
              instant={streamInstant(3)}
              text={SHARE_MSG_2}
              as="p"
              className="share-docs__body"
              msPerWord={55}
              onDone={() => advanceStage(3)}
            />
          )}

          {stage >= 3 && (
            <>
              <StreamText
                instant={streamInstant(4)}
                text={SHARE_MSG_3}
                as="p"
                className="share-docs__prompt"
                msPerWord={70}
                onDone={() => advanceStage(4)}
              />
            </>
          )}

          {stage >= 4 &&
            shareDocsActionReplies.map((reply) => (
              <ShareDocsUserReplyPill key={reply.id} label={reply.label} />
            ))}

          {stage >= 4 && stage < 5 && shareDocsActionReplies.length === 0 && (
            <div className="share-docs__actions share-docs__actions--fade-in">
              <div className="share-docs__action-cards">
                <button className="share-docs__action-card" onClick={handleUpload}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="share-docs__action-label">Upload</span>
                </button>
                <button
                  className="share-docs__action-card"
                  onClick={() => handleShareDocsActionTile("Connect", () => setProviderConnectOpen(true))}
                >
                  <img src="images/plug.png" alt="" width="24" height="24" />
                  <span className="share-docs__action-label">Connect</span>
                </button>
                <button
                  className="share-docs__action-card"
                  onClick={() => handleShareDocsActionTile("Camera", () => setCameraOpen(true))}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span className="share-docs__action-label">Camera</span>
                </button>
              </div>
              <button className="share-docs__skip" onClick={handleSkipDocs}>Skip for now</button>
            </div>
          )}

          {stage >= 5 && uploadFetchStep < UPLOAD_FETCH_STEPS.length && (
            <FetchingProgress
              steps={UPLOAD_FETCH_STEPS}
              visibleCount={uploadFetchStep}
              title="Working"
              className="fetch-progress--chat"
            />
          )}

          {stage >= 5 && uploadFetchStep >= UPLOAD_FETCH_STEPS.length && visibleDocs > 0 && (
            <div className="share-docs__uploads share-docs__uploads--fade-in">
              {UPLOADED_DOCS.map((doc, i) => (
                <div
                  key={doc}
                  className="doc-chip doc-chip--fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <svg className="doc-chip__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span className="doc-chip__name">{doc}</span>
                </div>
              ))}
            </div>
          )}

          {stage >= 7 && (
            <>
              <button className="docs-confirmed docs-confirmed--fade-in" onClick={onTaxStory}>
                <svg className="docs-confirmed__check" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                </svg>
                <span className="docs-confirmed__text">3 Docs added to Chloe&rsquo;s 2026 taxes</span>
                <svg className="docs-confirmed__chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>

              <StreamText
                instant={streamInstant(8)}
                text="Awesome. Your docs are in and ready to go."
                as="p"
                className="share-docs__body"
                msPerWord={60}
                onDone={() => advanceStage(8)}
              />
            </>
          )}

          {stage >= 8 && (
            <div className="doc-carousel-wrap doc-carousel-wrap--fade-in">
              <div
                className="doc-carousel"
                ref={carouselRef}
                onScroll={() => {
                  if (!carouselRef.current) return;
                  const el = carouselRef.current;
                  const cardW = el.firstElementChild
                    ? (el.firstElementChild as HTMLElement).offsetWidth + 12
                    : 1;
                  setActiveCard(Math.round(el.scrollLeft / cardW));
                }}
              >
                {DOC_CARDS.map((card, cardIdx) => (
                  <div
                    key={card.name}
                    className="doc-review-card"
                    style={{ background: card.bg }}
                  >
                    <div className="doc-review-card__header">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={card.fg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                      </svg>
                      <span style={{ color: card.fg }}>{card.name}</span>
                    </div>
                    <p className="doc-review-card__amount" style={{ color: card.fg }}>
                      {card.amount}
                    </p>
                    <p className="doc-review-card__detail" style={{ color: card.fg, opacity: 0.75 }}>
                      {card.detail}
                    </p>
                    <button
                      className="doc-review-card__btn"
                      style={{ borderColor: card.fg, color: card.fg }}
                      onClick={() => setReviewIdx(cardIdx)}
                    >
                      Review doc info
                    </button>
                  </div>
                ))}
              </div>
              <div className="doc-carousel__dots">
                {DOC_CARDS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`doc-carousel__dot${i === activeCard ? " doc-carousel__dot--active" : ""}`}
                    aria-label={`Show document ${i + 1} of ${DOC_CARDS.length}`}
                    aria-current={i === activeCard ? "true" : undefined}
                    onClick={() => scrollToDocCard(i)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── E*Trade / Chase income (after doc carousel) ── */}
          {stage >= 11 && (
            <div className="etrade-flow etrade-flow--fade-in" style={{ marginTop: 30 }}>
              <StreamText
                instant={streamInstant(12)}
                text="From your Chase document, it looks like you had income on E*trade this year."
                as="p"
                className="share-docs__body"
                msPerWord={60}
                onDone={() => advanceStage(12)}
              />
            </div>
          )}

          {stage >= 12 && (
            <StreamText
              instant={streamInstant(13)}
              text="If you sold RSUs, we can connect your E*Trade account and pull in your stock sales, so you don't have to enter them yourself."
              as="p"
              className="share-docs__body etrade-flow--fade-in"
              msPerWord={50}
              onDone={() => {}}
            />
          )}
          {stage === 12 && (
            <div className="etrade-flow__actions etrade-flow--fade-in">
              <Button variant="primary" size="small" label="Connect Etrade" className="etrade-chip" onClick={() => {
                setConnectFilled(false);
                setConnectSheet(true);
              }} />
              <Button variant="secondary" size="small" label="Not now" className="etrade-chip" onClick={() => setStage(15)} />
            </div>
          )}
          {stage >= 13 && (
            <div className="etrade-flow__actions">
              <span className="chosen-chip">Connect Etrade</span>
            </div>
          )}

          {/* ── Screen 2 result: after connect, show Sign into Etrade bubble ── */}
          {stage >= 13 && (
            <div className="etrade-flow etrade-flow--fade-in">
              <div className="doc-chip doc-chip--fade-in" style={{ marginTop: 16 }}>
                <svg className="doc-chip__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D8050" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                </svg>
                <span className="doc-chip__name">Fetched Etrade stock sales form</span>
              </div>
            </div>
          )}

          {/* ── Screen 4: Importing animation ── */}
          {stage >= 14 && stage < 16 && (
            <div className="etrade-flow etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <div className="etrade-import">
                <IntuitAssistBrand className="etrade-import__icon" size={24} />
                <span className="etrade-import__label">Importing..</span>
              </div>
              <div className="etrade-import__steps">
                {IMPORT_STEPS.map((step, i) => (
                  <div key={step} className={`etrade-import__step ${i < importStep ? "etrade-import__step--done" : ""}`}>
                    <span className={`etrade-import__bullet ${i < importStep ? "etrade-import__bullet--done" : ""}`} />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Screen 5 trigger: after import done, show Add docs sheet ── */}

          {/* ── Expert help conversation (after Add docs) ── */}
          {stage >= 16 && (
            <div className="etrade-flow etrade-flow--fade-in" style={{ marginTop: 30 }}>
              <StreamText
                instant={streamInstant(17)}
                text="I need a bit more info to get your RSU cost basis right. Getting it right means you won't get taxed twice on the same income."
                as="p"
                className="share-docs__body"
                msPerWord={50}
                onDone={() => advanceStage(17)}
              />
            </div>
          )}

          {stage >= 17 && (
            <div className="etrade-flow etrade-flow--fade-in">
              <StreamText
                instant={streamInstant(18)}
                text="An expert who's familiar with RSUs can help sort this out quickly or I can walk you through it."
                as="p"
                className="share-docs__body"
                msPerWord={50}
                onDone={() => advanceStage(18)}
              />
            </div>
          )}

          {stage >= 18 && (
            <>
              <StreamText
                instant={streamInstant(19)}
                text="How would you like to dig into this?"
                as="p"
                className="share-docs__body etrade-flow--fade-in"
                msPerWord={60}
                onDone={() => advanceStage(19)}
              />
            </>
          )}

          {stage >= 19 && (
            <div className="expert-tiles etrade-flow--fade-in">
              <div
                className={`expert-tile${stage >= 20 ? " expert-tile--selected" : ""}`}
                onClick={stage >= 20 ? undefined : () => setStage(20)}
              >
                <img className="expert-tile__img" src="images/experts-trio.png" alt="" />
                <p className="expert-tile__title">Get unlimited expert help</p>
                <p className="expert-tile__sub">$19 to talk to an expert during tax prep and year-round. Covers all tax situations.</p>
              </div>
              <button
                className={`expert-tile__alt${stage >= 20 ? " expert-tile__alt--locked" : ""}`}
                onClick={stage >= 20 ? undefined : onTaxStory}
              >
                Adjust the cost basis myself
              </button>
            </div>
          )}

          {/* ── Expert match card 1 of 2 ── */}
          {stage >= 20 && (
            <div className="etrade-flow etrade-flow--fade-in" style={{ marginTop: 30 }}>
              <StreamText
                instant={streamInstant(21)}
                text="Here's what we know about you to find you the perfect expert. Any updates before we match you?"
                as="p"
                className="share-docs__body"
                msPerWord={50}
                onDone={() => advanceStage(21)}
              />
            </div>
          )}

          {stage >= 21 && stage < 23 && (
            <ExpertMatchCard
              step={stage >= 22 ? 2 : 1}
              onNext={() => { if (stage === 21) setStage(22); else setStage(23); }}
              onSkip={() => { if (stage === 21) setStage(22); else setStage(23); }}
              onPrev={() => { if (stage === 22) setStage(21); }}
            />
          )}

          {/* ── After card 2 Next: chat playback ── */}
          {stage >= 23 && stage < 25 && (
            <div className="etrade-flow etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <div className="explain__user-bubble" style={{ marginBottom: 16 }}>
                I&rsquo;m looking for a expert in Seattle who has experience in W-2, stocks, and crypto.
              </div>
              <div className="explain__user-bubble">
                Prefers to work with expert in person, on video call or chat
              </div>
            </div>
          )}

          {stage === 24 && (
            <ExpertMatchAnimation
              screenRef={screenRef}
              onPhaseChange={setExpertMatchPhase}
              onDone={() => setStage(25)}
            />
          )}

          {/* ── Expert matched card (in chat) ── */}
          {stage >= 25 && (
            <div className="matched-card etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <div className="matched-card__top">
                <div className="matched-card__avatar-wrap" aria-hidden>
                  <img src="images/matched-card/avatar-ripples.svg" alt="" className="matched-card__ripples" />
                  <img src="images/ben.png" alt="" className="matched-card__avatar" />
                </div>
                <div className="matched-card__info">
                  <div className="matched-card__copy">
                    <h3 className="matched-card__heading">You&rsquo;re matched with Ben!</h3>
                    <div className="matched-card__meta">
                      <div className="matched-card__stars-row">
                        <div className="matched-card__stars" aria-hidden>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <img key={i} src="images/matched-card/star-full.svg" alt="" className="matched-card__star-icon" />
                          ))}
                        </div>
                        <span className="matched-card__rating">4.8 (482)</span>
                        <span className="matched-card__sep">&bull;</span>
                        <span className="matched-card__exp">14 years experience</span>
                      </div>
                      <p className="matched-card__specialties">W-2 income &bull; Sold stocks &bull; WA taxes &bull; +6</p>
                    </div>
                  </div>
                  <button type="button" className="matched-card__profile" onClick={() => setBenProfile(true)}>
                    View Ben&rsquo;s profile
                    <img src="images/matched-card/arrow.png" alt="" className="matched-card__profile-chevron" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="matched-card__team-row">
                <div className="matched-card__team-avatars" aria-hidden>
                  <img src="images/franklin.png" alt="" className="matched-card__team-avatar" />
                  <img src="images/daniella.png" alt="" className="matched-card__team-avatar" />
                </div>
                <p className="matched-card__team-text">Includes a team of experts for year-round help</p>
              </div>
            </div>
          )}

          {/* ── Price update text ── */}
          {stage >= 26 && (
            <div className="etrade-flow etrade-flow--fade-in" style={{ marginTop: 24 }}>
              <StreamText
                instant={streamInstant(27)}
                text="Here's an update on your price. For just $19, you now have access to:"
                as="p"
                className="share-docs__body"
                msPerWord={50}
                onDone={() => advanceStage(27)}
              />
            </div>
          )}

          {stage >= 27 && (
            <div className="price-bullets etrade-flow--fade-in">
              <p className="price-bullet">·&ensp;Unlimited calls with Ben</p>
              <p className="price-bullet">·&ensp;An expert final review</p>
              <p className="price-bullet">·&ensp;A team of year round experts</p>
            </div>
          )}

          {/* ── Price card ── */}
          {stage >= 28 && (
            <div className="price-card etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <div className="price-card__header">
                <span className="price-card__label">Your price</span>
                <StatusPillBestOutcome />
              </div>
              <p className="price-card__price">$108</p>
              <p className="price-card__sub">You won&rsquo;t pay more</p>
              <div className={`price-card__breakdown ${breakdownOpen ? "price-card__breakdown--open" : ""}`} onClick={() => setBreakdownOpen(!breakdownOpen)}>
                <span>The breakdown</span>
                <svg className={`price-card__chevron ${breakdownOpen ? "price-card__chevron--up" : ""}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {breakdownOpen && (
                <div className="price-card__details">
                  <div className="price-card__line">
                    <span className="price-card__line-label">AI powered tax help</span>
                    <span className="price-card__line-value">$89</span>
                  </div>
                  <div className="price-card__line">
                    <span className="price-card__line-label">Expert Assist</span>
                    <span className="price-card__line-value">$19</span>
                  </div>
                  <div className="price-card__line price-card__line--sub">
                    <span className="price-card__line-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>
                    </span>
                    <span className="price-card__line-label">Expert review</span>
                    <span className="price-card__line-value">Included</span>
                  </div>
                  <div className="price-card__line price-card__line--sub">
                    <span className="price-card__line-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="15" cy="8" r="3"/><path d="M3 20v-1a6 6 0 016-6h6a6 6 0 016 6v1"/></svg>
                    </span>
                    <span className="price-card__line-label">Team of experts</span>
                    <span className="price-card__line-value">Included</span>
                  </div>
                  <div className="price-card__line price-card__line--sub">
                    <span className="price-card__line-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </span>
                    <span className="price-card__line-label">Audit protection</span>
                    <span className="price-card__line-value">Included</span>
                  </div>
                  <div className="price-card__total">
                    <span>Total</span>
                    <span>$108</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── "Ben has been added" banner ── */}
          {stage >= 29 && (
            <div className="ben-joined etrade-flow--fade-in" style={{ marginTop: 28 }}>
              <span className="ben-joined__line" />
              <img src="images/ben.png" alt="" className="ben-joined__avatar" />
              <span className="ben-joined__text">Ben has been added to the chat</span>
              <span className="ben-joined__line" />
            </div>
          )}

          {/* ── Ben's intro (single bubble) ── */}
          {stage >= 29 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 24 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <StreamText
                  instant={streamInstant(32)}
                  text={BEN_INTRO_MESSAGE}
                  as="p"
                  className="ben-chat__para"
                  msPerWord={42}
                  onDone={() => advanceStage(32)}
                />
              </div>
            </div>
          )}

          {/* ── Action chips (before Keep going) ── */}
          {stage >= 32 && !keepGoingChosen && !welcomeCallChosen && (
            <div className="ben-chat__actions etrade-flow--fade-in">
              <Button variant="primary" size="small" label="Keep going in chat" className="etrade-chip" onClick={() => {
                  setKeepGoingChosen(true);
                  setStage(33);
                }} />
              <Button variant="secondary" size="small" label="Schedule a call" className="etrade-chip" onClick={() => {
                  setWelcomeCallChosen(true);
                  setStage(33);
                  openScheduleCall();
                }} />
            </div>
          )}

          {keepGoingChosen && stage >= 33 && (
            <div className="ben-chat__actions etrade-flow--fade-in">
              <span className="chosen-chip">Keep going in chat</span>
            </div>
          )}

          {welcomeCallChosen && !keepGoingChosen && stage >= 33 && (
            <div className="ben-chat__actions etrade-flow--fade-in">
              <span className="chosen-chip">Schedule a call</span>
            </div>
          )}

          {welcomeCallChosen && !keepGoingChosen && welcomeScheduleDismissed && !welcomeCallBookedAppointment && stage >= 33 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <p className="ben-chat__para">
                  No worries — we can schedule whenever you&rsquo;re ready. Want to keep going here in
                  chat for now?
                </p>
              </div>
            </div>
          )}

          {welcomeCallChosen && !keepGoingChosen && welcomeScheduleDismissed && !welcomeCallBookedAppointment && stage >= 33 && (
            <div className="ben-chat__actions etrade-flow--fade-in">
              <Button variant="primary" size="small" label="Keep going in chat" className="etrade-chip" onClick={() => {
                  setKeepGoingChosen(true);
                  setStage(34);
                }} />
              <Button variant="secondary" size="small" label="Schedule a call" className="etrade-chip" onClick={() => openScheduleCall()} />
            </div>
          )}

          {welcomeCallBookedAppointment && stage >= 33 && !benWrapUpDone && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <p className="ben-chat__para">
                  You&rsquo;re all set for <strong>April {welcomeCallBookedAppointment.dayId}</strong> at{" "}
                  <strong>{welcomeCallBookedAppointment.slot} PT</strong>. We&rsquo;ll call you over a
                  one-way video.
                </p>
              </div>
            </div>
          )}

          {welcomeCallBookedAppointment && !keepGoingChosen && stage >= 33 && !benWrapUpDone && (
            <div className="ben-chat__actions etrade-flow--fade-in">
              <Button variant="primary" size="small" label="Keep going in chat" className="etrade-chip" onClick={() => {
                  setKeepGoingChosen(true);
                  setStage((s) => Math.max(s, 34));
                }} />
            </div>
          )}

          {/* ── Steps 2–6: cost-basis thread after Keep going ── */}
          {keepGoingChosen && stage >= 34 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <StreamText
                  instant={streamInstant(35)}
                  text={BEN_COST_BASIS_OPEN}
                  as="p"
                  className="ben-chat__para"
                  msPerWord={45}
                  onDone={() => advanceStage(35)}
                />
              </div>
            </div>
          )}

          {keepGoingChosen && stage >= 35 && (
            <div className="user-bubble etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <div className="user-bubble__body">{CHLOE_ESPP_MESSAGE}</div>
            </div>
          )}

          {keepGoingChosen && stage >= 36 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <StreamText
                  instant={streamInstant(37)}
                  text={BEN_ADJUSTED_BASIS_MESSAGE}
                  as="p"
                  className="ben-chat__para"
                  msPerWord={32}
                  onDone={() => advanceStage(37)}
                />
                {stage >= 37 && (
                  <StreamText
                    instant={streamInstant(38)}
                    text={BEN_ACCESS_QUESTION}
                    as="p"
                    className="ben-chat__para"
                    msPerWord={48}
                    onDone={() => advanceStage(38)}
                  />
                )}
              </div>
            </div>
          )}

          {keepGoingChosen && stage >= 38 && (
            <div className="user-bubble etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <div className="user-bubble__body">{CHLOE_GMAIL_MESSAGE}</div>
            </div>
          )}

          {keepGoingChosen && stage >= 39 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <StreamText
                  instant={streamInstant(40)}
                  text={BEN_GMAIL_PERMISSION_MESSAGE}
                  as="p"
                  className="ben-chat__para"
                  msPerWord={38}
                  onDone={() => advanceStage(40)}
                />
              </div>
            </div>
          )}

          {/* ── Step 7: Gmail connect pills ── */}
          {keepGoingChosen && stage >= 40 && !googleConnectChosen && (
            <div className="ben-chat__actions etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <Button variant="primary" size="small" label="Yes connect my gmail" className="etrade-chip" onClick={() => {
                  setGoogleConnectChosen(true);
                  setGoogleConnectOpen(true);
                }} />
              <Button variant="secondary" size="small" label="Skip for now" className="etrade-chip" onClick={() => {
                  setGoogleConnectChosen(false);
                  setStage(43);
                }} />
            </div>
          )}

          {keepGoingChosen && googleConnectChosen && stage >= 40 && (
            <div className="ben-chat__actions etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <span className="chosen-chip">Yes connect my gmail</span>
            </div>
          )}

          {keepGoingChosen && stage >= 42 && gmailImportedFiles.length > 0 && (
            <div className="share-docs__uploads share-docs__uploads--gmail">
              {[...gmailImportedFiles]
                .sort((a, b) => (a.includes("NVIDIA") ? -1 : b.includes("NVIDIA") ? 1 : 0))
                .map((file, i) => (
                <div
                  key={file}
                  className="doc-chip doc-chip--fade-in"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <svg className="doc-chip__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  <span className="doc-chip__name">{file}</span>
                </div>
              ))}
            </div>
          )}

          {keepGoingChosen &&
            stage >= 43 &&
            gmailImportedFiles.length === 0 &&
            !googleConnectChosen && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                <StreamText
                  instant={previewMode}
                  text={BEN_GMAIL_SKIP_IMPORT_MESSAGE}
                  as="p"
                  className="ben-chat__para"
                  msPerWord={45}
                />
              </div>
            </div>
          )}

          {keepGoingChosen && stage >= 43 && gmailImportedFiles.length > 0 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                {gmailBenPara === 0 && (
                  <StreamText
                    instant={previewMode}
                    text={BEN_GMAIL_IMPORT_SUCCESS_P1}
                    as="p"
                    className="ben-chat__para"
                    msPerWord={45}
                    onDone={() => setGmailBenPara(1)}
                  />
                )}
                {gmailBenPara >= 1 && (
                  <p className="ben-chat__para">{BEN_GMAIL_IMPORT_SUCCESS_P1}</p>
                )}
                {gmailBenPara === 1 && (
                  <StreamText
                    instant={previewMode}
                    text={BEN_GMAIL_IMPORT_SUCCESS_P2}
                    as="p"
                    className="ben-chat__para"
                    msPerWord={45}
                    onDone={() => {
                      setGmailBenPara(2);
                      if (stage === 43) setStage(44);
                    }}
                  />
                )}
                {gmailBenPara >= 2 && (
                  <p className="ben-chat__para">{BEN_GMAIL_IMPORT_SUCCESS_P2}</p>
                )}
              </div>
            </div>
          )}

          {keepGoingChosen &&
            stage >= 44 &&
            gmailImportedFiles.length > 0 &&
            deductionsChoice === null && (
            <div className="ben-chat__actions etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <Button variant="primary" size="small" label="Review deductions" className="etrade-chip" onClick={() => {
                  setDeductionsChoice("review");
                  setBenWrapUpDone(false);
                  onHubOpen();
                  setStage(45);
                }} />
              <Button variant="secondary" size="small" label="Skip" className="etrade-chip" onClick={() => {
                  setDeductionsChoice("skip");
                  setBenWrapUpDone(false);
                  setStage(45);
                }} />
            </div>
          )}

          {keepGoingChosen && deductionsChoice === "skip" && stage >= 45 && stage < 46 && (
            <div className="ben-chat__actions etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <span className="chosen-chip">Skip</span>
            </div>
          )}

          {keepGoingChosen && deductionsChoice === "review" && stage >= 45 && (
            <div className="ben-chat__actions etrade-flow--fade-in" style={{ marginTop: 16 }}>
              <span className="chosen-chip">Review deductions</span>
            </div>
          )}

          {keepGoingChosen && (deductionsChoice === "skip" || deductionsChoice === "review") && stage >= 46 && (
            <div className="ben-chat etrade-flow--fade-in" style={{ marginTop: 20 }}>
              <img src="images/ben.png" alt="" className="ben-chat__avatar" />
              <div className="ben-chat__bubble">
                {!benWrapUpDone ? (
                  <StreamText
                    instant={previewMode}
                    text={BEN_CHAT_WRAPUP_MESSAGE}
                    as="p"
                    className="ben-chat__para"
                    msPerWord={42}
                    onDone={() => setBenWrapUpDone(true)}
                  />
                ) : (
                  <p className="ben-chat__para">{BEN_CHAT_WRAPUP_MESSAGE}</p>
                )}
              </div>
            </div>
          )}

          {keepGoingChosen && (deductionsChoice === "skip" || deductionsChoice === "review") && benWrapUpDone && (
            <>
              <BenSessionEnded />
              <PostCallFlow
                coverageOutcome={postCallCoverage}
                skipToChecks={postCallSkipToChecks}
                previewPhase={postCallPreviewPhase}
                previewExpertReview={postCallPreviewExpertReview}
                previewSchedulePhase={postCallSchedulePhase}
                onAddMoreDocs={() => setAddDocsSheet(true)}
                onScheduleCall={openScheduleCall}
                onExpertReviewBooked={setAppointmentUpcoming}
                onPhaseChange={(phase) => {
                  scrollChatToBottom();
                  onPostCallPhaseChange?.(phase);
                }}
                appointmentScreenOpen={!!appointmentUpcoming}
              />
            </>
          )}

          <div ref={bottomRef} />
        </div>
        )}
      </div>

      {scheduleCallOpen && (
        <ScheduleCallFlow
          onBooked={closeScheduleBooked}
          onDismiss={closeScheduleDismissed}
          onStepChange={onScheduleStepChange}
          initialStep={previewScheduleStep ?? "calendar"}
        />
      )}

      {!(
        googleConnectOpen ||
        providerConnectOpen ||
        connectSheet ||
        fetchSheet ||
        addDocsSheet ||
        reviewIdx !== null ||
        scheduleCallOpen ||
        appointmentUpcoming ||
        uploadPickerOpen ||
        expertUpgradeOpen
      ) &&
        (
          <DiwmAiComposer
            variant="diwm"
            expertLive={stage >= 29 && !benWrapUpDone}
            expertLabel={resolveShareDocsComposerExpertLabel(stage, benWrapUpDone)}
            expertAvatarSrc={resolveShareDocsComposerExpertAvatar(stage)}
            expertInteraction={composerExpertInteraction}
            onExpertUpgradeClick={openExpertUpgrade}
            onScheduleCall={openScheduleCall}
          />
        )}

      {expertUpgradeOpen && (
        <ExpertUpgradeSheet onClose={closeExpertUpgrade} onAddExpertAssist={acceptExpertUpgrade} />
      )}

      {providerConnectOpen && (
        <DeviceFrameSheetPortal className="connect-scrim" onClick={() => setProviderConnectOpen(false)}>
          <div className="connect-sheet connect-sheet--animate" onClick={(e) => e.stopPropagation()}>
            <div className="connect-sheet__header">
              <button className="connect-sheet__back" onClick={() => setProviderConnectOpen(false)} aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 16l-6-6 6-6"/>
                </svg>
              </button>
              <h2 className="connect-sheet__title">Connections</h2>
              <button className="connect-sheet__close" onClick={() => setProviderConnectOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 5l8 8M13 5l-8 8"/></svg>
              </button>
            </div>
            <div className="connect-sheet__list">
              {CONNECT_PROVIDERS.map((p) => (
                <button
                  key={p.name}
                  className="connect-row"
                  onClick={() => {
                    setProviderConnectOpen(false);
                    onProviderSignIn();
                  }}
                >
                  <div className="connect-row__icon-ring">
                    <img className="connect-row__icon" src={p.icon} alt={p.name} />
                  </div>
                  <span className="connect-row__name">{p.name}</span>
                  <svg className="connect-row__chevron" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4l5 5-5 5"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </DeviceFrameSheetPortal>
      )}

      {googleConnectOpen && (
        <GoogleConnectFlow
          onClose={() => setGoogleConnectOpen(false)}
          onComplete={(files) => {
            setGoogleConnectOpen(false);
            onGmailImported(files);
            setDeductionsChoice(null);
            setGmailBenPara(0);
            setBenWrapUpDone(false);
            setStage(42);
            setTimeout(() => setStage(43), 900);
          }}
        />
      )}

      {/* ── Review bottom sheet (existing) ── */}
      {reviewIdx !== null && (
        <DeviceFrameSheetPortal className="review-scrim" onClick={() => setReviewIdx(null)}>
          <div className="review-sheet review-sheet--animate" onClick={(e) => e.stopPropagation()}>
            <div className="review-sheet__header">
              <span className="review-sheet__title">{DOC_CARDS[reviewIdx].reviewTitle}</span>
              <button className="review-sheet__close" onClick={() => setReviewIdx(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="review-sheet__subtitle">{DOC_CARDS[reviewIdx].reviewSubtitle}</p>
            <div className="review-sheet__lines">
              {DOC_CARDS[reviewIdx].lines.map((line) => (
                <div key={line.n} className="review-line">
                  <span className="review-line__num">{line.n}</span>
                  <span className="review-line__label">{line.label}</span>
                  <span className="review-line__value">{line.value}</span>
                </div>
              ))}
            </div>
            <button className="review-sheet__edit" onClick={() => setReviewIdx(null)}>Edit</button>
          </div>
        </DeviceFrameSheetPortal>
      )}

      {/* ── Screen 2: Connections bottom sheet (Etrade sign-in) ── */}
      {connectSheet && (
        <DeviceFrameSheetPortal className="connect-scrim connect-scrim--etrade" onClick={() => setConnectSheet(false)}>
          <div className="connect-sheet connect-sheet--signin" data-node-id="2623:68950" onClick={(e) => e.stopPropagation()}>
            <div className="connect-sheet__header">
              <h2 className="connect-sheet__title">Connect</h2>
              <button type="button" className="connect-sheet__close" onClick={() => setConnectSheet(false)} aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 5l14 14M19 5L5 19"/>
                </svg>
              </button>
            </div>

            <div className="connect-sheet__body">
              <div className="connect-sheet__intro">
                <div className="connect-sheet__logos">
                  <img src="images/logo.png" alt="TurboTax" className="connect-sheet__logo-tt" />
                  <span className="connect-sheet__dots" aria-hidden="true" />
                  <img src="images/etrade_logo.png" alt="E*Trade" className="connect-sheet__logo-etrade" />
                </div>

                <div className="connect-sheet__copy">
                  <p className="connect-sheet__headline">We&rsquo;ll do the heavy lifting for you</p>
                  <p className="connect-sheet__sub">
                    TurboTax will auto-import your supplemental form and adjust your cost basis for you.
                  </p>
                </div>

                <div className="connect-sheet__fields">
                  <label className="connect-sheet__field">
                    <span className="connect-sheet__label">Username</span>
                    <div className="connect-sheet__input" onClick={() => setConnectFilled(true)}>
                      {connectFilled ? "chloegreen" : <span className="connect-sheet__placeholder">&nbsp;</span>}
                    </div>
                  </label>
                  <label className="connect-sheet__field">
                    <span className="connect-sheet__label">Password</span>
                    <div className="connect-sheet__input" onClick={() => setConnectFilled(true)}>
                      {connectFilled ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : <span className="connect-sheet__placeholder">&nbsp;</span>}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="connect-sheet__footer">
              <button
                type="button"
                className="connect-sheet__btn"
                onClick={() => {
                  setConnectSheet(false);
                  setFetchSheet(true);
                  setFetchStep(0);
                }}
              >
                Connect
              </button>
            </div>
          </div>
        </DeviceFrameSheetPortal>
      )}

      {/* ── Screen 3: Fetching bottom sheet ── */}
      {fetchSheet && (
        <DeviceFrameSheetPortal className="review-scrim" onClick={() => setFetchSheet(false)}>
          <div className="fetch-sheet fetch-sheet--animate" onClick={(e) => e.stopPropagation()}>
            <div className="fetch-sheet__header">
              <button className="fetch-sheet__back" onClick={() => { setFetchSheet(false); setConnectSheet(true); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button className="fetch-sheet__close" onClick={() => setFetchSheet(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <FetchingProgress steps={ETRADE_FETCH_STEPS} visibleCount={fetchStep} />
            <button className="fetch-sheet__cancel" onClick={() => setFetchSheet(false)}>Cancel</button>
          </div>
        </DeviceFrameSheetPortal>
      )}

      {/* ── Screen 5: Add your docs bottom sheet ── */}
      {addDocsSheet && (
        <DeviceFrameSheetPortal className="review-scrim" onClick={() => setAddDocsSheet(false)}>
          <div className="add-docs-sheet add-docs-sheet--animate" onClick={(e) => e.stopPropagation()}>
            <button className="add-docs-sheet__close" onClick={() => setAddDocsSheet(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <p className="add-docs-sheet__title">Add your docs</p>
            <button className="add-docs-sheet__row" onClick={() => setAddDocsChecked(!addDocsChecked)}>
              <span className="add-docs-sheet__doc-name">Etrade 1099-B_2025</span>
              <span className={`add-docs-sheet__check ${addDocsChecked ? "add-docs-sheet__check--on" : ""}`}>
                {addDocsChecked && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>
            </button>
            <button className="add-docs-sheet__add" onClick={() => {
              setAddDocsSheet(false);
              setStage(16);
            }}>Add</button>
            <button className="add-docs-sheet__cancel" onClick={() => setAddDocsSheet(false)}>Cancel</button>
          </div>
        </DeviceFrameSheetPortal>
      )}

      {/* ── Ben's profile full-screen overlay ── */}
      {benProfile && (
        <DeviceFrameSheetPortal className="ben-profile" role="dialog" aria-label="Ben B. profile">
          <div className="ben-profile__rings" aria-hidden>
            <div className="ben-profile__ring ben-profile__ring--1" />
            <div className="ben-profile__ring ben-profile__ring--2" />
            <div className="ben-profile__ring ben-profile__ring--3" />
            <div className="ben-profile__ring ben-profile__ring--4" />
          </div>

          <button
            type="button"
            className="ben-profile__close"
            onClick={() => setBenProfile(false)}
            aria-label="Close profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div className="ben-profile__content">
            <img src="images/experts-trio.png" alt="" className="ben-profile__team-photo" />

            <h2 className="ben-profile__name">Ben B.</h2>
            <p className="ben-profile__sub">
              <img src="images/arrow-reply.png" alt="" className="ben-profile__reply-icon" />
              Plus a team for year-round help
            </p>

            <div className="ben-profile__badges">
              <StatusPillAvailable />
              <StatusPillBestOutcome />
            </div>

            <p className="ben-profile__skilled">Skilled in:</p>
            <div className="ben-profile__skills">
              <span className="ben-profile__skill">W-2</span>
              <span className="ben-profile__skill">Investments</span>
              <span className="ben-profile__skill">Multi-state taxes</span>
              <span className="ben-profile__skill">WA taxes</span>
            </div>

            <div className="ben-profile__actions">
              <button type="button" className="ben-profile__action">
                <img src="images/ben-profile-call.png" alt="" className="ben-profile__action-icon" />
                <span>Call</span>
              </button>
              <button type="button" className="ben-profile__action">
                <img src="images/ben-profile-chat.png" alt="" className="ben-profile__action-icon" />
                <span>Chat</span>
              </button>
              <button
                type="button"
                className="ben-profile__action"
                onClick={() => {
                  setBenProfile(false);
                  openScheduleCall();
                }}
              >
                <img src="images/ben-profile-schedule.png" alt="" className="ben-profile__action-icon" />
                <span>Schedule a call</span>
              </button>
            </div>
          </div>
        </DeviceFrameSheetPortal>
      )}

      {/* ── Camera overlay ── */}
      {cameraOpen && (
        <DeviceFrameSheetPortal className="camera-overlay">
          <div className="camera-overlay__top">
            <button className="camera-overlay__close" onClick={() => setCameraOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <span className="camera-overlay__label">Scan document</span>
            <button className="camera-overlay__flash">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </button>
          </div>
          <div className="camera-overlay__viewfinder">
            <span className="camera-overlay__corner camera-overlay__corner--tl" />
            <span className="camera-overlay__corner camera-overlay__corner--tr" />
            <span className="camera-overlay__corner camera-overlay__corner--bl" />
            <span className="camera-overlay__corner camera-overlay__corner--br" />
          </div>
          <p className="camera-overlay__hint">Position your document within the frame</p>
          <div className="camera-overlay__bottom">
            <button className="camera-overlay__gallery">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <button className="camera-overlay__shutter" onClick={() => setCameraOpen(false)}>
              <span className="camera-overlay__shutter-inner" />
            </button>
            <div style={{ width: 44 }} />
          </div>
        </DeviceFrameSheetPortal>
      )}

      {uploadPickerOpen && <DocUploadPickerScreen onDone={handleUploadPickerDone} />}
    </div>
  );
}

/* ━━━ Tax Story screen (Taxes + Tools tabs) ━━━ */

type TaxSectionItem = {
  category: string;
  title: string;
  detail: string;
};

type TaxSectionStatus = "default" | "in-progress" | "complete";

type TaxSectionRow = {
  label: string;
  iconSrc: string;
  status: TaxSectionStatus;
  /** In-progress fill (0–100). Ignored when status is complete. */
  progress?: number;
  items?: TaxSectionItem[];
  /** Expert review row — light blue card, no status chip */
  expertHighlight?: boolean;
};

const TAX_SECTION_ICON = {
  myInfo: "images/my-info.png",
  income: "images/income.png",
  deductions: "images/deductions-credits.png",
  state: "images/state.png",
  expertReview: "images/expert-review.png",
  reviewFile: "images/review-file.png",
  file: "images/file.png",
} as const;

const DEDUCTIONS_EXPANDED_ITEMS: TaxSectionItem[] = [
  { category: "Tax deduction", title: "4019k) contribution", detail: "Fully written off: $4,700" },
  { category: "Tax deduction", title: "HSA contribution", detail: "Box 1: $6,7050" },
];

type TaxStoryTaxesConfig = {
  progressPct: number;
  federalRefund: string;
  stateRefund: string;
  showExpertInSearch: boolean;
  sections: TaxSectionRow[];
  initialExpanded: string | null;
};

const TAX_STORY_TAXES_CONFIG: Record<TaxStoryTaxesVariant, TaxStoryTaxesConfig> = {
  "complete-with-state-refund": {
    progressPct: 75,
    federalRefund: "$5,154",
    stateRefund: "$892",
    showExpertInSearch: true,
    initialExpanded: null,
    sections: [
      { label: "My info", iconSrc: TAX_SECTION_ICON.myInfo, status: "complete" },
      { label: "Income", iconSrc: TAX_SECTION_ICON.income, status: "complete" },
      { label: "Deductions & credits", iconSrc: TAX_SECTION_ICON.deductions, status: "complete" },
      { label: "State", iconSrc: TAX_SECTION_ICON.state, status: "complete" },
      { label: "Expert review", iconSrc: TAX_SECTION_ICON.expertReview, status: "default", expertHighlight: true },
    ],
  },
  "deductions-expanded": {
    progressPct: 50,
    federalRefund: "$1,606",
    stateRefund: "$-",
    showExpertInSearch: true,
    initialExpanded: "Deductions & credits",
    sections: [
      { label: "My info", iconSrc: TAX_SECTION_ICON.myInfo, status: "complete" },
      { label: "Income", iconSrc: TAX_SECTION_ICON.income, status: "complete" },
      {
        label: "Deductions & credits",
        iconSrc: TAX_SECTION_ICON.deductions,
        status: "in-progress",
        progress: 50,
        items: DEDUCTIONS_EXPANDED_ITEMS,
      },
      { label: "State", iconSrc: TAX_SECTION_ICON.state, status: "default" },
      { label: "Review & file", iconSrc: TAX_SECTION_ICON.reviewFile, status: "default" },
    ],
  },
  "empty-start": {
    progressPct: 2,
    federalRefund: "$-",
    stateRefund: "$-",
    showExpertInSearch: false,
    initialExpanded: null,
    sections: [
      { label: "My info", iconSrc: TAX_SECTION_ICON.myInfo, status: "default" },
      { label: "Income", iconSrc: TAX_SECTION_ICON.income, status: "default" },
      { label: "Deductions & credits", iconSrc: TAX_SECTION_ICON.deductions, status: "default" },
      { label: "State", iconSrc: TAX_SECTION_ICON.state, status: "default" },
      { label: "Review & file", iconSrc: TAX_SECTION_ICON.reviewFile, status: "default" },
    ],
  },
  "in-progress-with-expert": {
    progressPct: 30,
    federalRefund: "$1,606",
    stateRefund: "$-",
    showExpertInSearch: true,
    initialExpanded: null,
    sections: [
      { label: "My info", iconSrc: TAX_SECTION_ICON.myInfo, status: "in-progress", progress: 55 },
      { label: "Income", iconSrc: TAX_SECTION_ICON.income, status: "in-progress", progress: 55 },
      { label: "Deductions & credits", iconSrc: TAX_SECTION_ICON.deductions, status: "default" },
      { label: "State", iconSrc: TAX_SECTION_ICON.state, status: "default" },
      { label: "Expert review", iconSrc: TAX_SECTION_ICON.expertReview, status: "default", expertHighlight: true },
      { label: "File", iconSrc: TAX_SECTION_ICON.file, status: "default" },
    ],
  },
  "expert-final-review": {
    progressPct: 90,
    federalRefund: "$1,606",
    stateRefund: "$892",
    showExpertInSearch: true,
    initialExpanded: null,
    sections: [
      { label: "My info", iconSrc: TAX_SECTION_ICON.myInfo, status: "complete" },
      { label: "Income", iconSrc: TAX_SECTION_ICON.income, status: "complete" },
      {
        label: "Deductions & credits",
        iconSrc: TAX_SECTION_ICON.deductions,
        status: "complete",
        items: DEDUCTIONS_EXPANDED_ITEMS,
      },
      { label: "State", iconSrc: TAX_SECTION_ICON.state, status: "complete" },
      {
        label: "Expert review",
        iconSrc: "images/expert-avatar.png",
        status: "in-progress",
        expertHighlight: true,
      },
    ],
  },
  "mid-progress": {
    progressPct: 25,
    federalRefund: "$1,230",
    stateRefund: "$-",
    showExpertInSearch: false,
    initialExpanded: null,
    sections: [
      { label: "My info", iconSrc: TAX_SECTION_ICON.myInfo, status: "in-progress", progress: 50 },
      { label: "Income", iconSrc: TAX_SECTION_ICON.income, status: "in-progress", progress: 50 },
      { label: "Deductions & credits", iconSrc: TAX_SECTION_ICON.deductions, status: "default" },
      { label: "State", iconSrc: TAX_SECTION_ICON.state, status: "default" },
      { label: "Review & file", iconSrc: TAX_SECTION_ICON.reviewFile, status: "default" },
    ],
  },
};

function isRefundPositive(amount: string) {
  return amount !== "$-" && amount !== "$–" && amount.trim().length > 0;
}

function TaxRefundDisplay({ label, amount, accentLabel }: { label: string; amount: string; accentLabel?: boolean }) {
  const positive = isRefundPositive(amount);
  return (
    <div className="tax-story__refund">
      <p
        className={`tax-story__refund-label${accentLabel && positive ? " tax-story__refund-label--accent" : ""}`}
      >
        {label}
      </p>
      <p
        className={`tax-story__refund-amount${positive ? " tax-story__refund-amount--positive" : ""}`}
      >
        {amount}
      </p>
    </div>
  );
}

function TaxSectionChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`tax-section-card__chevron${expanded ? " tax-section-card__chevron--up" : ""}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function TaxSectionCompletePill() {
  return (
    <span className="tax-section-card__complete">Complete</span>
  );
}

function TaxSectionInProgressPill() {
  return <span className="tax-section-card__in-progress">In progress</span>;
}

function TaxSectionReviewButton({
  highlighted,
  onClick,
}: {
  highlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`tax-section-card__review-wrap${
        highlighted ? " tax-section-card__review-wrap--highlight" : ""
      }`}
    >
      {highlighted && (
        <svg className="tax-section-card__review-ring" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
          <rect x="1.5" y="1.5" width="97" height="37" rx="18.5" pathLength="100" />
        </svg>
      )}
      <button
        type="button"
        className="tax-section-card__review"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        Review
      </button>
    </div>
  );
}

function TaxSectionCard({
  section,
  expanded,
  onToggle,
  onReviewItem,
  highlightReviewTitle,
}: {
  section: TaxSectionRow;
  expanded: boolean;
  onToggle: () => void;
  onReviewItem?: (item: TaxSectionItem) => void;
  highlightReviewTitle?: string;
}) {
  const inProgress = section.status === "in-progress";
  const complete = section.status === "complete";
  const hasBody = (section.items?.length ?? 0) > 0;
  const progress = section.progress ?? 50;

  const cardClass = [
    "tax-section-card",
    inProgress ? "tax-section-card--started" : "",
    complete ? "tax-section-card--complete" : "",
    section.expertHighlight ? "tax-section-card--expert" : "",
    expanded ? "tax-section-card--expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <button type="button" className="tax-section-card__header" onClick={onToggle} aria-expanded={expanded}>
        <span className="tax-section-card__icon">
          <img className="tax-section-card__icon-img" src={section.iconSrc} alt="" width={20} height={20} />
        </span>
        <span className="tax-section-card__label">{section.label}</span>
        {complete && <TaxSectionCompletePill />}
        {inProgress && section.expertHighlight && <TaxSectionInProgressPill />}
        {inProgress && !section.expertHighlight && (
          <span className="tax-section-card__bar">
            <span className="tax-section-card__bar-fill" style={{ width: `${progress}%` }} />
          </span>
        )}
        <TaxSectionChevron expanded={expanded} />
      </button>

      {expanded && hasBody && (
        <div className="tax-section-card__body">
          {section.items!.map((item, i) => (
            <div key={`${item.title}-${i}`} className="tax-section-card__item">
              <div className="tax-section-card__item-text">
                <p className="tax-section-card__item-category">{item.category}</p>
                <p className="tax-section-card__item-title">{item.title}</p>
                <p className="tax-section-card__item-detail">{item.detail}</p>
              </div>
              <TaxSectionReviewButton
                highlighted={highlightReviewTitle === item.title}
                onClick={() => onReviewItem?.(item)}
              />
            </div>
          ))}
        </div>
      )}

      {expanded && !hasBody && (
        <p className="tax-section-card__empty">We&rsquo;ll help you with this section when you&rsquo;re ready.</p>
      )}
    </div>
  );
}

const CHECKLIST_ITEMS = [
  { category: "Wages & salaries", source: "Clover W-2" },
  { category: "Dividends", source: "Capital Partners 1099-DIV" },
  { category: "Prior return", source: "2025 Form 1040" },
];

const TOOLS_TAB_ACTION_ITEMS = [
  { id: "1", label: "Update receipts from moving", done: false },
  { id: "2", label: "Confirm if CA withholdings were after move to WA", done: false },
] as const;

const TOOLS_SECTION_ICONS = {
  checkComplete: "images/tools-check-complete.png",
  documentChecklist: "images/tools-document-icon.png",
} as const;

function ToolsListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ToolsSectionChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`tools-section__chevron${expanded ? " tools-section__chevron--up" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ToolsTabPanel({
  checklistItems,
}: {
  checklistItems: { category: string; source: string }[];
}) {
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["action-items"]));

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const actionItemsOpen = openSections.has("action-items");
  const checklistOpen = openSections.has("document-checklist");

  return (
    <div className="tax-story__tools-panel">
      <section
        className={`tools-section tools-section--action-items${actionItemsOpen ? " tools-section--expanded" : ""}`}
      >
        <button
          type="button"
          className="tools-section__header"
          onClick={() => toggleSection("action-items")}
          aria-expanded={actionItemsOpen}
        >
          <ToolsListIcon />
          <span className="tools-section__title">Action items</span>
          <ToolsSectionChevron expanded={actionItemsOpen} />
        </button>

        {actionItemsOpen && (
          <ul className="tools-action-items__list">
            {TOOLS_TAB_ACTION_ITEMS.map((item) => (
              <li key={item.id} className="tools-action-items__item">
                {item.done ? (
                  <img
                    className="tools-action-items__check-img"
                    src={TOOLS_SECTION_ICONS.checkComplete}
                    alt=""
                    width={20}
                    height={20}
                    aria-hidden
                  />
                ) : (
                  <span className="tools-action-items__check tools-action-items__check--pending" aria-hidden />
                )}
                <span
                  className={
                    item.done
                      ? "tools-action-items__label"
                      : "tools-action-items__label tools-action-items__label--pending"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={`tools-section tools-section--checklist${checklistOpen ? " tools-section--expanded" : ""}`}
      >
        <button
          type="button"
          className="tools-section__header"
          onClick={() => toggleSection("document-checklist")}
          aria-expanded={checklistOpen}
        >
          <img
            className="tools-section__icon-img"
            src={TOOLS_SECTION_ICONS.documentChecklist}
            alt=""
            width={20}
            height={20}
          />
          <span className="tools-section__title">Document checklist</span>
          <span className="tools-section__count">
            {checklistItems.length}/{checklistItems.length}
          </span>
          <ToolsSectionChevron expanded={checklistOpen} />
        </button>

        {checklistOpen && (
          <div className="tools-section__body">
            {checklistItems.map((item) => (
              <div key={item.source} className="tax-story__checklist-item">
                <div className="tax-story__checklist-left">
                  <p className="tax-story__checklist-category">{item.category}</p>
                  <p className="tax-story__checklist-source">{item.source}</p>
                </div>
                <div className="tax-story__checklist-right">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#287F39" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="tax-story__checklist-added">Added</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button type="button" className="tax-story__nav-row">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M8 14h.01M12 14h.01M16 14h.01" strokeWidth="2" />
        </svg>
        <span>Previous docs &amp; tax returns</span>
        <ToolsSectionChevron expanded={false} />
      </button>

      <button type="button" className="tax-story__nav-row">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
        <span>Manage connections</span>
        <ToolsSectionChevron expanded={false} />
      </button>
    </div>
  );
}

function buildChecklistItems(gmailFiles: string[]) {
  const items = [...CHECKLIST_ITEMS];
  if (gmailIncludesNvidiaW2(gmailFiles)) {
    items.unshift({ category: "Wages & salaries", source: "NVIDIA W-2 (2024)" });
  }
  return items;
}

function TaxStoryScreen({
  initialTab,
  taxesVariant,
  onBack,
  onChat,
  gmailImportedFiles,
  initialReturnReviewed = false,
  initialPlanAheadOpen = false,
  initialMidYearCheckInOpen = false,
  initialReferFriendOpen = false,
  initialVideoCallActive = false,
  initialIncomingCallOpen = false,
  initialHsaReviewOpen = false,
  onStepChange,
}: {
  initialTab: "taxes" | "tools";
  taxesVariant: TaxStoryTaxesVariant;
  onBack: () => void;
  onChat: () => void;
  gmailImportedFiles: string[];
  /** Reports the active tax-story sub-step up to the parent so the Jump-to menu keeps tracking. */
  onStepChange?: (value: string) => void;
  /** Design preview: land on return-reviewed screen with Ben on call */
  initialReturnReviewed?: boolean;
  /** Design preview: land on plan-ahead screen with Ben on call */
  initialPlanAheadOpen?: boolean;
  /** Design preview: land on mid-year check-in scheduled screen */
  initialMidYearCheckInOpen?: boolean;
  /** Design preview: land on refer-a-friend screen */
  initialReferFriendOpen?: boolean;
  initialVideoCallActive?: boolean;
  /** Deep-link preview: land on the incoming-call sheet (before accepting). */
  initialIncomingCallOpen?: boolean;
  /** Deep-link preview: land with the Form 8889 (HSA) review sheet open. */
  initialHsaReviewOpen?: boolean;
}) {
  const taxesConfig = TAX_STORY_TAXES_CONFIG[taxesVariant];
  const [tab, setTab] = useState<"taxes" | "tools">(initialTab);
  const [expandedSection, setExpandedSection] = useState<string | null>(taxesConfig.initialExpanded);
  const [incomingCallOpen, setIncomingCallOpen] = useState(initialIncomingCallOpen);
  const [incomingCallShown, setIncomingCallShown] = useState(
    initialReturnReviewed ||
      initialPlanAheadOpen ||
      initialMidYearCheckInOpen ||
      initialReferFriendOpen ||
      initialHsaReviewOpen ||
      initialVideoCallActive ||
      initialIncomingCallOpen,
  );
  const [videoCallActive, setVideoCallActive] = useState(
    initialVideoCallActive || initialReturnReviewed || initialPlanAheadOpen,
  );
  const [hsaReviewOpen, setHsaReviewOpen] = useState(initialHsaReviewOpen);
  const [hsaReviewHighlight, setHsaReviewHighlight] = useState(false);
  const [returnReviewedOpen, setReturnReviewedOpen] = useState(initialReturnReviewed);
  const [planAheadOpen, setPlanAheadOpen] = useState(initialPlanAheadOpen);
  const [midYearCheckInOpen, setMidYearCheckInOpen] = useState(initialMidYearCheckInOpen);
  const [referFriendOpen, setReferFriendOpen] = useState(initialReferFriendOpen);
  const taxStoryScrollRef = useRef<HTMLDivElement>(null);
  const checklistItems = buildChecklistItems(gmailImportedFiles);
  const progressBarPct = returnReviewedOpen ? 100 : taxesConfig.progressPct;
  const showIncomingCallFlow = taxesVariant === "expert-final-review";

  /* Reset scroll to top when switching to the refer-a-friend screen (don't inherit prior scroll). */
  useEffect(() => {
    if (referFriendOpen) {
      taxStoryScrollRef.current?.scrollTo({ top: 0 });
    }
  }, [referFriendOpen]);

  /* Mirror the active sub-step up so the "Jump to…" menu keeps tracking as the user advances
     through the live call → return reviewed → plan ahead → mid-year → refer-a-friend sequence. */
  useEffect(() => {
    const step = referFriendOpen
      ? "taxstory:refer-friend"
      : midYearCheckInOpen
        ? "taxstory:mid-year-check-in"
        : planAheadOpen
          ? "taxstory:plan-ahead"
          : returnReviewedOpen
            ? "taxstory:return-reviewed"
            : hsaReviewOpen
              ? "taxstory:hsa-review"
              : incomingCallOpen
                ? "taxstory:incoming-call"
                : videoCallActive
                  ? "taxstory:live-review"
                  : tab === "tools"
                    ? "screen:tax-story?tools"
                    : "screen:tax-story?taxes";
    onStepChange?.(step);
  }, [
    referFriendOpen,
    midYearCheckInOpen,
    planAheadOpen,
    returnReviewedOpen,
    hsaReviewOpen,
    incomingCallOpen,
    videoCallActive,
    tab,
    onStepChange,
  ]);

  useEffect(() => {
    if (!showIncomingCallFlow || incomingCallShown) return;
    const id = window.setTimeout(() => {
      setIncomingCallOpen(true);
      setIncomingCallShown(true);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [showIncomingCallFlow, incomingCallShown]);

  useEffect(() => {
    if (!videoCallActive || taxesVariant !== "expert-final-review" || returnReviewedOpen) return;
    setExpandedSection("Deductions & credits");
  }, [videoCallActive, taxesVariant, returnReviewedOpen]);

  useEffect(() => {
    if (
      !videoCallActive ||
      taxesVariant !== "expert-final-review" ||
      hsaReviewOpen ||
      returnReviewedOpen ||
      expandedSection !== "Deductions & credits"
    ) {
      return;
    }
    setHsaReviewHighlight(false);
    const id = window.setTimeout(() => setHsaReviewHighlight(true), 700);
    return () => window.clearTimeout(id);
  }, [videoCallActive, taxesVariant, hsaReviewOpen, returnReviewedOpen, expandedSection]);

  const handleAcceptIncomingCall = useCallback(() => {
    setIncomingCallOpen(false);
    setVideoCallActive(true);
    setExpandedSection("Deductions & credits");
    setTab("taxes");
  }, []);

  const handleHsaReviewClose = useCallback(() => {
    setHsaReviewOpen(false);
    setReturnReviewedOpen(true);
  }, []);

  const handleApproveReturn = useCallback(() => {
    setReturnReviewedOpen(false);
    setPlanAheadOpen(true);
  }, []);

  const handleScheduleCheckIn = useCallback(() => {
    setPlanAheadOpen(false);
    setMidYearCheckInOpen(true);
    setVideoCallActive(false);
  }, []);

  const handleOpenReferral = useCallback(() => {
    setReferFriendOpen(true);
  }, []);

  const handleReviewItem = useCallback(
    (item: TaxSectionItem) => {
      if (item.title === "HSA contribution" && videoCallActive && taxesVariant === "expert-final-review") {
        setHsaReviewHighlight(false);
        setHsaReviewOpen(true);
      }
    },
    [videoCallActive, taxesVariant],
  );

  const toggleSection = (label: string) => {
    setExpandedSection((prev) => (prev === label ? null : label));
  };

  return (
    <div className={`screen${incomingCallOpen || hsaReviewOpen ? " screen--modal-open" : ""}${videoCallActive ? " screen--video-call" : ""}${returnReviewedOpen ? " screen--return-reviewed" : ""}${planAheadOpen ? " screen--plan-ahead" : ""}${midYearCheckInOpen ? " screen--mid-year-check-in" : ""}${referFriendOpen ? " screen--refer-friend" : ""}`}>
      {referFriendOpen || midYearCheckInOpen || planAheadOpen ? (
        <DiwmAssistedToolbar
          variant="l0"
          showTitleRow
          hideVignetteLabel
          onMenuOpen={onBack}
          onHubOpen={onChat}
        />
      ) : (
        <DiwmAssistedToolbar
          variant="l1"
          showTitleRow
          title="Chloe's 2026 taxes"
          progress={progressBarPct}
          onBack={onBack}
          onHubOpen={onChat}
        />
      )}
      <div
        ref={taxStoryScrollRef}
        className={`screen__scroll${
          tab === "taxes" && !returnReviewedOpen && !planAheadOpen && !midYearCheckInOpen && !referFriendOpen
            ? " screen__scroll--taxes-tab"
            : ""
        }${returnReviewedOpen ? " screen__scroll--return-reviewed" : ""}${planAheadOpen ? " screen__scroll--plan-ahead" : ""}${midYearCheckInOpen ? " screen__scroll--mid-year-check-in" : ""}${referFriendOpen ? " screen__scroll--refer-friend" : ""}`}
      >
        {referFriendOpen ? (
          <ReferFriendScreen />
        ) : midYearCheckInOpen ? (
          <MidYearCheckInScreen onOpenReferral={handleOpenReferral} />
        ) : planAheadOpen ? (
          <PlanAheadScreen onScheduleCheckIn={handleScheduleCheckIn} />
        ) : returnReviewedOpen ? (
          <ReturnReviewedScreen onApproveReturn={handleApproveReturn} />
        ) : (
          <>
        <Tabs
          className="tax-story__tabs"
          tabs={[
            { id: "taxes", label: "Taxes" },
            { id: "tools", label: "Tools" },
          ]}
          activeTab={tab}
          onTabChange={(id) => setTab(id as "taxes" | "tools")}
        />

        {tab === "tools" && (
          <div className="tax-story__content">
            <ToolsTabPanel checklistItems={checklistItems} />
          </div>
        )}

        {tab === "taxes" && (
          <div className="tax-story__taxes-panel">
            <div className="tax-story__taxes-scroll">
              <div className="tax-story__refunds">
                <TaxRefundDisplay
                  label="Federal refund"
                  amount={taxesConfig.federalRefund}
                  accentLabel
                />
                <TaxRefundDisplay label="State refund" amount={taxesConfig.stateRefund} />
              </div>

              <div className="tax-section-card-list">
                {taxesConfig.sections.map((sec) => (
                  <TaxSectionCard
                    key={sec.label}
                    section={sec}
                    expanded={expandedSection === sec.label}
                    onToggle={() => toggleSection(sec.label)}
                    onReviewItem={handleReviewItem}
                    highlightReviewTitle={hsaReviewHighlight ? "HSA contribution" : undefined}
                  />
                ))}
              </div>
            </div>

            <div className="tax-story__taxes-footer">
              <Button
                variant="secondary"
                size="small"
                label="Add anything"
                className="tax-story__add-btn w-full"
              />
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {videoCallActive && !midYearCheckInOpen && !referFriendOpen && <BenVideoCallFrame />}

      {incomingCallOpen && (
        <BenIncomingCallSheet
          onDismiss={() => setIncomingCallOpen(false)}
          onAccept={handleAcceptIncomingCall}
        />
      )}

      {hsaReviewOpen && <Form8889ReviewSheet onClose={handleHsaReviewClose} />}

    </div>
  );
}

/* ━━━ Connect screen ━━━ */

const CONNECT_FULL_TEXT =
  "Great choice! There are a few ways you can provide your income docs, but connecting your accounts is the fastest.";

function ConnectScreen({
  onBack,
  onHubOpen,
  progress,
  onProviderSignIn,
  onUpload,
  onEnterManually,
  onExpertUpgrade,
}: {
  onBack: () => void;
  onHubOpen: () => void;
  progress: number;
  onProviderSignIn: () => void;
  onUpload: () => void;
  /** TODO: confirm dedicated manual-entry route when product defines it */
  onEnterManually: () => void;
  onExpertUpgrade?: () => void;
}) {
  const [showSheet, setShowSheet] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [dismissRecovery, setDismissRecovery] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTextDone = useCallback(() => {
    setIntroComplete(true);
    setTimeout(() => setShowSheet(true), 800);
  }, []);

  const handleDrawerDismiss = useCallback(() => {
    setShowSheet(false);
    setDismissRecovery(true);
  }, []);

  const handleDrawerBack = useCallback(() => {
    setShowSheet(false);
  }, []);

  const handleProviderSelect = useCallback(() => {
    setShowSheet(false);
    onProviderSignIn();
  }, [onProviderSignIn]);

  useEffect(() => {
    if (!dismissRecovery) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
    return () => clearTimeout(id);
  }, [dismissRecovery]);

  return (
    <div className="screen">
      <DiwmAssistedToolbar
        variant="l1"
        showTitleRow
        title="Chloe's 2026 taxes"
        progress={progress}
        onBack={onBack}
        onHubOpen={onHubOpen}
      />
      <div className="screen__scroll">
        <div className="explain__chat">
          <div className="explain__user-bubble">Connect my accounts</div>
          {introComplete ? (
            <p className="explain__assistant-msg">{CONNECT_FULL_TEXT}</p>
          ) : (
            <StreamText
              text={CONNECT_FULL_TEXT}
              as="p"
              className="explain__assistant-msg"
              msPerWord={55}
              onDone={handleTextDone}
            />
          )}

          {dismissRecovery && (
            <>
              <p className="explain__assistant-msg etrade-flow--fade-in" style={{ marginTop: 20 }}>
                No problem &mdash; want to try a different way? You can also{" "}
                <strong>upload photos</strong> of your docs or <strong>enter info manually</strong>.
              </p>
              <div className="etrade-flow__actions etrade-flow--fade-in">
                <Button variant="primary" size="small" label="Upload photos" className="etrade-chip" onClick={onUpload} />
                <Button variant="secondary" size="small" label="Enter manually" className="etrade-chip" onClick={onEnterManually} />
                <Button variant="outline" size="small" label="Connect my accounts" className="etrade-chip" onClick={() => setShowSheet(true)} />
              </div>
            </>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {showSheet ? (
        <ConnectionsDrawer
          entryPoint="connect_screen"
          onDismiss={handleDrawerDismiss}
          onBackInDrawer={handleDrawerBack}
          onProviderSelect={handleProviderSelect}
        />
      ) : (
        <DiwmPreMatchExpertComposer onAddExpertAssist={onExpertUpgrade} />
      )}
    </div>
  );
}

/* ━━━ Explain screen ━━━ */

const EXPLAIN_PILLS = [
  "Job (W-2)",
  "Self-employed/freelance",
  "Sold stock",
  "Sold crypto",
  "Retirement income",
  "Multiple states",
  "Rental properties",
  "Other income",
  "Need to file for 2023 or 2024",
] as const;

const PILL_INCOME_LABELS: Record<(typeof EXPLAIN_PILLS)[number], string> = {
  "Job (W-2)": "W-2",
  "Self-employed/freelance": "Self-employed",
  "Sold stock": "Sold stocks",
  "Sold crypto": "Sold crypto",
  "Retirement income": "Retirement income",
  "Multiple states": "Multiple states",
  "Rental properties": "Rental properties",
  "Other income": "Other income",
  "Need to file for 2023 or 2024": "Prior-year filing",
};

const HOUSEHOLD_PILLS = new Set<(typeof EXPLAIN_PILLS)[number]>([
  "Multiple states",
  "Need to file for 2023 or 2024",
]);

function buildExplainSummary(selection: ExplainSelection) {
  const selected = new Set(selection.pills);
  const household: string[] = [];
  const income: string[] = [];

  const location = selection.location.trim();
  if (location) household.push(location);

  for (const pill of EXPLAIN_PILLS) {
    if (!selected.has(pill)) continue;
    const label = PILL_INCOME_LABELS[pill];
    if (HOUSEHOLD_PILLS.has(pill)) {
      if (!household.includes(label)) household.push(label);
    } else {
      income.push(label);
    }
  }

  return {
    household: household.length ? household.join(", ") : "Not specified",
    income: income.length ? income.join(", ") : "Not specified",
  };
}

const EXPLAIN_FULL_TEXT =
  "Awesome, I\u2019ll help with that. A few quick questions will help us find what other forms you need. Then I\u2019ll start looking for deductions and credits.";

function ExplainScreen({
  editOnly,
  onBack,
  onHubOpen,
  progress,
  initialSelection,
  onNext,
  onExpertUpgrade,
}: {
  editOnly: boolean;
  onBack: () => void;
  onHubOpen: () => void;
  progress: number;
  initialSelection: ExplainSelection;
  onNext: (selection: ExplainSelection) => void;
  onExpertUpgrade?: () => void;
}) {
  const [showCard, setShowCard] = useState(editOnly);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelection.pills),
  );
  const [location, setLocation] = useState(initialSelection.location || "Seattle");
  const [cardDismissed, setCardDismissed] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cardOpen = showCard && !cardDismissed;

  const submitSelection = () => {
    onNext({ pills: Array.from(selected), location });
  };

  const handleTextDone = useCallback(() => {
    setTimeout(() => setShowCard(true), 800);
  }, []);

  const togglePill = (pill: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill);
      else next.add(pill);
      return next;
    });
  };

  const closeCard = () => {
    if (editOnly) onBack();
    else setCardDismissed(true);
  };

  useEffect(() => {
    if (!cardOpen) return;
    const scrollCardIntoView = () => {
      const scroll = scrollAreaRef.current;
      const card = cardRef.current;
      if (!scroll || !card) return;
      const cardBottom = card.offsetTop + card.offsetHeight;
      const targetScrollTop = cardBottom - scroll.clientHeight + 12;
      scroll.scrollTo({ top: Math.max(0, targetScrollTop), behavior: "smooth" });
    };
    const id = window.setTimeout(scrollCardIntoView, editOnly ? 0 : 450);
    return () => window.clearTimeout(id);
  }, [cardOpen, editOnly]);

  return (
    <div className={`screen${cardOpen ? " screen--explain-card-open" : ""}`}>
      <DiwmAssistedToolbar
        variant="l1"
        showTitleRow
        title="Chloe's 2026 taxes"
        progress={progress}
        onBack={onBack}
        onHubOpen={onHubOpen}
      />
      <div className="screen__scroll" ref={scrollAreaRef}>
        <div className="explain__chat">
          {!editOnly && (
            <>
              <div className="explain__user-bubble">Explain my situation</div>
              <StreamText
                text={EXPLAIN_FULL_TEXT}
                as="p"
                className="explain__assistant-msg"
                msPerWord={55}
                onDone={handleTextDone}
              />
            </>
          )}

          {cardOpen && (
            <div
              ref={cardRef}
              className={`explain-card${editOnly ? "" : " explain-card--animate"}`}
              data-node-id="2903:41665"
            >
              <div className="explain-card__body">
                <div className="explain-card__header">
                  <h2 className="explain-card__title">Tell us about yourself</h2>
                  <button className="explain-card__close" onClick={closeCard} aria-label="Close">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 5l10 10M15 5L5 15"/>
                    </svg>
                  </button>
                </div>

                <div className="explain-card__pills">
                  {EXPLAIN_PILLS.map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      className={`explain-pill${selected.has(pill) ? " explain-pill--on" : ""}`}
                      onClick={() => togglePill(pill)}
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                <div className="explain-card__location">
                  <label className="explain-card__loc-label">Location</label>
                  <div className="explain-card__loc-field">
                    <input
                      className="explain-card__loc-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    <img className="explain-card__loc-icon" src="images/location.png" alt="" width="24" height="24" />
                  </div>
                </div>
              </div>

              <div className="explain-card__footer">
                <button type="button" className="explain-card__skip" onClick={submitSelection}>Skip</button>
                <button type="button" className="explain-card__next" onClick={submitSelection}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DiwmPreMatchExpertComposer onAddExpertAssist={onExpertUpgrade} />
    </div>
  );
}
