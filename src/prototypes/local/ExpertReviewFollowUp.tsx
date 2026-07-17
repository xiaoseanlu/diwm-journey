import { useState } from "react";
import { ChatBubble, ReplyChip } from "./PostCallChat";

export const EXPERT_REVIEW_USER_REPLY = "Get an Expert Review";

export const EXPERT_REVIEW_MEET_QUESTION = "Would you like to meet now or later?";

export const EXPERT_REVIEW_MEET_OPTIONS = ["Meet now", "Schedule an appointment"] as const;

function FinalReviewCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="expert-review-card" aria-label="Final review with Ben">
      <div className="expert-review-card__hero">
        <img src="images/ben.png" alt="" className="expert-review-card__avatar" />
        <div className="expert-review-card__hero-text">
          <p className="expert-review-card__title">Get a final review with Ben, before you file</p>
          <p className="expert-review-card__subtitle">Included, at no extra cost</p>
        </div>
      </div>
      <button
        type="button"
        className="expert-review-card__how"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>See how it works</span>
        <svg
          className={`expert-review-card__chevron${expanded ? " expert-review-card__chevron--up" : ""}`}
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
      {expanded && (
        <div className="expert-review-card__details">
          <p>
            Ben and his team double-check your return for accuracy, credits, and filing readiness
            before you submit.
          </p>
        </div>
      )}
    </section>
  );
}

export function ExpertReviewFollowUp({
  showMeetOptions = true,
  onMeetNow,
  onScheduleAppointment,
}: {
  /** Hide Meet now / Schedule chips after sheet is dismissed or booked */
  showMeetOptions?: boolean;
  onMeetNow?: () => void;
  onScheduleAppointment?: () => void;
}) {
  return (
    <div className="post-call-expert-review etrade-flow--fade-in">
      <ChatBubble role="user">{EXPERT_REVIEW_USER_REPLY}</ChatBubble>
      <FinalReviewCard />
      <ChatBubble role="assistant">{EXPERT_REVIEW_MEET_QUESTION}</ChatBubble>
      {showMeetOptions && (
        <div className="post-call-replies">
          {EXPERT_REVIEW_MEET_OPTIONS.map((label) => (
            <ReplyChip
              key={label}
              label={label}
              onClick={() => {
                if (label === "Meet now") onMeetNow?.();
                else onScheduleAppointment?.();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
