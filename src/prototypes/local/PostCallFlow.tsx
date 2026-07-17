import { useCallback, useEffect, useRef, useState } from "react";
import type { ScheduleCallHandlers, ScheduledAppointment } from "./ExpertReviewSchedulePaths";
import { RefundEstimateOutcome } from "./RefundEstimateOutcome";
import { ChatBubble, ReplyChip } from "./PostCallChat";
import { RunningChecksAnimation } from "./RunningChecksAnimation";
import { StateInterimScreen } from "./StateInterimScreen";
import { TranscribingAnimation } from "./TranscribingAnimation";
import { IntuitAssistBrand } from "./IntuitAssistBrand";

/* ── Copy (matches attached flow screenshots) ── */

export const POST_CALL_DOCS_QUESTION =
  "Let's keep your filing moving. Do you have any more docs to add?";

export const POST_CALL_DOCS_REPLY_OPTIONS = [
  "No, I added everything",
  "Yes, add more",
  "I have more, but they're not available",
] as const;

export const POST_CALL_DOCS_CONFIRM =
  "Great. Now, we'll check to ensure everything's covered.";

const CONVERSATION_SUMMARY =
  "Chloe relocated from California to Washington on April 14, 2025, requiring a part-year resident return for CA with income apportioned to her time in each state. She has W-2 wages from her employer and RSUs that vested in February — taxed as ordinary income at vesting — with roughly half sold in June, likely generating short-term capital gains. Ben will need her W-2, Schwab equity summary, and Form 1099-B to accurately calculate the multi-state split and any gain or loss on the sold shares.";

const RECAP_EMAIL_AND_PROFILE_NOTE =
  "We\u2019ll send this summary to your email and add these action items to your tax profile.";

const ACTION_ITEMS_ALL_COVERED = [
  { id: "1", label: "Update receipts from moving", done: false },
  { id: "2", label: "Confirm if CA withholdings were after move to WA", done: false },
] as const;

/* TODO(coverage): Replace with API-driven gap list when backend exists */
const ACTION_ITEMS_GAP_FOUND = [
  { id: "1", label: "Update receipts from moving", done: false },
  { id: "2", label: "Confirm if CA withholdings were after move to WA", done: false },
  { id: "3", label: "Upload Schwab equity summary (1099-B supplement)", done: false },
] as const;

const RECAP_SUMMARY_TO_FOLLOWUP_MS = 900;
const RECAP_TO_DOCS_MS = 1200;

function shouldShowRecapFollowUpImmediately(startPhase: PostCallPhase): boolean {
  return startPhase !== "transcribing" && startPhase !== "recap";
}

export type PostCallPhase =
  | "transcribing"
  | "recap"
  | "docs-prompt"
  | "docs-reply"
  | "processing"
  | "state-interim"
  | "refund-estimate";

function initialPhaseFromPreview(
  skipToChecks: boolean,
  previewPhase?: PostCallPhase,
): PostCallPhase {
  if (previewPhase) return previewPhase;
  if (skipToChecks) return "processing";
  return "transcribing";
}

function shouldShowRecap(phase: PostCallPhase): boolean {
  return (
    phase === "recap" ||
    phase === "docs-prompt" ||
    phase === "docs-reply" ||
    phase === "processing" ||
    phase === "state-interim" ||
    phase === "refund-estimate"
  );
}

function shouldShowDocsThread(phase: PostCallPhase, selectedReply: string | null): boolean {
  return (
    selectedReply !== null &&
    (phase === "docs-reply" || phase === "processing" || phase === "state-interim")
  );
}

export function SummaryCard({
  title,
  body,
  defaultExpanded = true,
}: {
  title: string;
  body: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <section className="post-call-summary-card">
      <button
        type="button"
        className="post-call-summary-card__header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <IntuitAssistBrand
          className="post-call-summary-card__icon"
          size={22}
        />
        <span className="post-call-summary-card__title">{title}</span>
        <svg
          className={`post-call-summary-card__chevron${expanded ? " post-call-summary-card__chevron--up" : ""}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>
      {expanded && <p className="post-call-summary-card__body">{body}</p>}
    </section>
  );
}

export type PostCallActionItem = { id: string; label: string; done: boolean };

export function ActionItemList({
  items,
  title = "Action items",
}: {
  items: readonly PostCallActionItem[];
  title?: string;
}) {
  return (
    <section className="post-call-action-card">
      <div className="post-call-action-card__header">
        <svg
          className="post-call-action-card__list-icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M6 5h12M6 10h12M6 15h8" />
          <circle cx="3" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="3" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="3" cy="15" r="1" fill="currentColor" stroke="none" />
        </svg>
        <span className="post-call-action-card__title">{title}</span>
      </div>
      <ul className="post-call-action-card__list">
        {items.map((item) => (
          <li key={item.id} className="post-call-action-card__item">
            <span
              className={`post-call-action-card__check${item.done ? " post-call-action-card__check--done" : ""}`}
              aria-hidden
            >
              {item.done && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 6l2.5 2.5 4.5-5"
                    stroke="#fff"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span
              className={
                item.done
                  ? "post-call-action-card__label"
                  : "post-call-action-card__label post-call-action-card__label--pending"
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type PostCallCoverageOutcome = "all-covered" | "gap-found";

export function PostCallFlow({
  coverageOutcome = "all-covered",
  skipToChecks = false,
  previewPhase,
  onAddMoreDocs,
  onScheduleCall,
  onPhaseChange,
  previewExpertReview = false,
  previewSchedulePhase = null,
  appointmentScreenOpen = false,
  onExpertReviewBooked,
}: {
  /** TODO(coverage): Set from doc-coverage check response — do not assume in production */
  coverageOutcome?: PostCallCoverageOutcome;
  /** Design preview: jump to running-checks (recap + doc thread shown) */
  skipToChecks?: boolean;
  /** Design preview: enter at a specific step */
  previewPhase?: PostCallPhase;
  onAddMoreDocs?: () => void;
  onScheduleCall?: (handlers?: ScheduleCallHandlers) => void;
  /** Notified whenever the post-call phase advances (lets the host keep the chat scrolled). */
  onPhaseChange?: (phase: PostCallPhase) => void;
  /** Design preview: refund estimate with expert-review follow-up visible */
  previewExpertReview?: boolean;
  /** Design preview: land already booked / declined (deep-link to post-scheduling steps) */
  previewSchedulePhase?: "booked" | "declined" | null;
  /** Hide in-chat booked confirmation while full-screen upcoming view is open */
  appointmentScreenOpen?: boolean;
  onExpertReviewBooked?: (appointment: ScheduledAppointment) => void;
}) {
  const startPhase = initialPhaseFromPreview(skipToChecks, previewPhase);
  const [phase, setPhase] = useState<PostCallPhase>(startPhase);
  const [recapFollowUpVisible, setRecapFollowUpVisible] = useState(() =>
    shouldShowRecapFollowUpImmediately(startPhase),
  );

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);
  const [selectedReply, setSelectedReply] = useState<string | null>(
    startPhase === "processing" ||
    startPhase === "state-interim" ||
    startPhase === "refund-estimate"
      ? "No, I added everything"
      : null,
  );

  const flowAnchorRef = useRef<HTMLDivElement>(null);

  const actionItems =
    coverageOutcome === "gap-found"
      ? ACTION_ITEMS_GAP_FOUND
      : ACTION_ITEMS_ALL_COVERED;

  const handleTranscribingComplete = useCallback(() => {
    setPhase("recap");
  }, []);

  useEffect(() => {
    if (phase !== "recap") return;
    if (recapFollowUpVisible) return;
    const id = window.setTimeout(() => setRecapFollowUpVisible(true), RECAP_SUMMARY_TO_FOLLOWUP_MS);
    return () => window.clearTimeout(id);
  }, [phase, recapFollowUpVisible]);

  useEffect(() => {
    if (phase !== "recap" || !recapFollowUpVisible) return;
    const id = window.setTimeout(() => setPhase("docs-prompt"), RECAP_TO_DOCS_MS);
    return () => window.clearTimeout(id);
  }, [phase, recapFollowUpVisible]);

  const handleDocsReply = useCallback(
    (label: string) => {
      setSelectedReply(label);
      if (label === "Yes, add more") {
        onAddMoreDocs?.();
        return;
      }
      /* TODO(coverage): "I have more, but they're not available" may need a distinct branch */
      setPhase("docs-reply");
      window.setTimeout(() => setPhase("processing"), 500);
    },
    [onAddMoreDocs],
  );

  const handleChecksComplete = useCallback(() => {
    setPhase("state-interim");
  }, []);

  const handleStateInterimContinue = useCallback(() => {
    setPhase("refund-estimate");
  }, []);

  const refundAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "docs-prompt" && phase !== "recap") return;
    const id = window.setTimeout(() => {
      flowAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
    return () => window.clearTimeout(id);
  }, [phase, recapFollowUpVisible]);

  useEffect(() => {
    if (phase !== "refund-estimate") return;
    const id = window.setTimeout(() => {
      refundAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
    return () => window.clearTimeout(id);
  }, [phase]);

  const showRecap = shouldShowRecap(phase);
  const showDocsThread = shouldShowDocsThread(phase, selectedReply);

  return (
    <div ref={flowAnchorRef} className="post-call-flow etrade-flow--fade-in">
      {phase === "transcribing" && (
        <TranscribingAnimation onComplete={handleTranscribingComplete} />
      )}

      {showRecap && (
        <div className="post-call-recap etrade-flow--fade-in">
          <SummaryCard title="Conversation summary" body={CONVERSATION_SUMMARY} />
          {recapFollowUpVisible && (
            <>
              <p className="post-call-recap__follow-up etrade-flow--fade-in">
                {RECAP_EMAIL_AND_PROFILE_NOTE}
              </p>
              <ActionItemList items={actionItems} />
            </>
          )}
        </div>
      )}

      {phase === "docs-prompt" && (
        <div className="post-call-docs-prompt etrade-flow--fade-in">
          <ChatBubble role="assistant">{POST_CALL_DOCS_QUESTION}</ChatBubble>
          <div className="post-call-replies">
            {POST_CALL_DOCS_REPLY_OPTIONS.map((label) => (
              <ReplyChip
                key={label}
                label={label}
                onClick={() => handleDocsReply(label)}
              />
            ))}
          </div>
        </div>
      )}

      {showDocsThread && (
        <div className="post-call-docs-thread etrade-flow--fade-in">
          <ChatBubble role="assistant">{POST_CALL_DOCS_QUESTION}</ChatBubble>
          <ChatBubble role="user">{selectedReply}</ChatBubble>
          <ChatBubble role="assistant">{POST_CALL_DOCS_CONFIRM}</ChatBubble>
        </div>
      )}

      {phase === "refund-estimate" && selectedReply && (
        <div className="post-call-docs-thread etrade-flow--fade-in">
          <ChatBubble role="assistant">{POST_CALL_DOCS_QUESTION}</ChatBubble>
          <ChatBubble role="user">{selectedReply}</ChatBubble>
        </div>
      )}

      {phase === "processing" && (
        <RunningChecksAnimation onComplete={handleChecksComplete} />
      )}

      {phase === "state-interim" && (
        <StateInterimScreen onContinue={handleStateInterimContinue} />
      )}

      <div ref={refundAnchorRef}>
        {phase === "refund-estimate" && (
          <RefundEstimateOutcome
            initialFollowUp={previewExpertReview ? "expert-review" : null}
            initialSchedulePhase={previewSchedulePhase}
            onScheduleCall={onScheduleCall}
            onExpertReviewBooked={onExpertReviewBooked}
            appointmentScreenOpen={appointmentScreenOpen}
          />
        )}
      </div>
    </div>
  );
}

export { ChatBubble, ReplyChip } from "./PostCallChat";
