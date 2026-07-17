import { useState } from "react";
import { ExpertReviewFollowUp } from "./ExpertReviewFollowUp";
import {
  ExpertReviewScheduleAlternative,
  ExpertReviewScheduleBooked,
  type ScheduledAppointment,
} from "./ExpertReviewSchedulePaths";
import { ChatBubble, ReplyChip } from "./PostCallChat";
import { StatusPillBestOutcome } from "./StatusPillBestOutcome";
import type { ScheduleCallHandlers } from "./ExpertReviewSchedulePaths";

export const REFUND_OUTCOME_INTRO =
  "Great. Now, we'll check to ensure everything's covered.";

export const REFUND_OUTCOME_VERIFIED =
  "Checked 300+ scenarios and verified you have the best outcome. Here's your refund estimate.";

export const REFUND_ESTIMATE_AMOUNT = "$1,606";

export const REFUND_OUTCOME_REPLY_OPTIONS = [
  "Get an Expert Review",
  "Show me a breakdown",
  "Pay and file",
] as const;

type RefundFollowUp = null | "expert-review" | "breakdown" | "pay-and-file";
type ExpertSchedulePhase = null | "booked" | "declined";
type ExpertAltChoice = null | "own" | "breakdown";

const DEFAULT_BOOKED_APPOINTMENT: ScheduledAppointment = {
  dayId: 4,
  slot: "9:45 AM",
  dayLabel: "Sunday, April 4, 2026",
};
const DEFAULT_BOOKED_MEET_LABEL = "Schedule an appointment";

export function RefundEstimateCard({
  amount = REFUND_ESTIMATE_AMOUNT,
}: {
  amount?: string;
}) {
  return (
    <section className="refund-estimate-card" aria-label="Federal refund estimate">
      <div className="refund-estimate-card__main">
        <p className="refund-estimate-card__label">Your estimated federal refund is</p>
        <p className="refund-estimate-card__amount">{amount}</p>
        <p className="refund-estimate-card__disclaimer">This may change as you add more details</p>
      </div>
      <div className="refund-estimate-card__footer">
        <img src="images/ben.png" alt="" className="refund-estimate-card__avatar" />
        <div className="refund-estimate-card__footer-info">
          <StatusPillBestOutcome />
          <p className="refund-estimate-card__ben-copy">Ben has reviewed everything for accuracy.</p>
        </div>
      </div>
    </section>
  );
}

export function RefundEstimateOutcome({
  initialFollowUp = null,
  initialSchedulePhase = null,
  onBreakdown,
  onExpertReview,
  onScheduleCall,
  onExpertReviewBooked,
  appointmentScreenOpen = false,
}: {
  /** Design preview: land with expert-review follow-up visible */
  initialFollowUp?: RefundFollowUp;
  /** Design preview: land already booked / declined (deep-link to post-scheduling steps) */
  initialSchedulePhase?: ExpertSchedulePhase;
  onBreakdown?: () => void;
  onExpertReview?: () => void;
  onScheduleCall?: (handlers?: ScheduleCallHandlers) => void;
  /** After pink confirmation — advance to the full upcoming-appointment screen. */
  onExpertReviewBooked?: (appointment: ScheduledAppointment) => void;
  appointmentScreenOpen?: boolean;
}) {
  const [followUp, setFollowUp] = useState<RefundFollowUp>(initialFollowUp);
  const [schedulePhase, setSchedulePhase] = useState<ExpertSchedulePhase>(initialSchedulePhase);
  const [meetLabel, setMeetLabel] = useState<string | null>(
    initialSchedulePhase === "booked" ? DEFAULT_BOOKED_MEET_LABEL : null,
  );
  const [appointment, setAppointment] = useState<ScheduledAppointment | null>(
    initialSchedulePhase === "booked" ? DEFAULT_BOOKED_APPOINTMENT : null,
  );
  const [altChoice, setAltChoice] = useState<ExpertAltChoice>(null);

  const openExpertSchedule = (label: string) => {
    setMeetLabel(label);
    onScheduleCall?.({
      onBooked: (appt) => {
        setSchedulePhase("booked");
        setAppointment(appt);
        onExpertReviewBooked?.(appt);
      },
      onDismissed: () => {
        setSchedulePhase("declined");
      },
    });
  };

  return (
    <div className="post-call-refund-outcome etrade-flow--fade-in">
      <ChatBubble role="assistant">{REFUND_OUTCOME_INTRO}</ChatBubble>
      <ChatBubble role="assistant">{REFUND_OUTCOME_VERIFIED}</ChatBubble>
      <RefundEstimateCard />

      {followUp === "expert-review" ? (
        <>
          <ExpertReviewFollowUp
            showMeetOptions={schedulePhase === null}
            onMeetNow={() => openExpertSchedule("Meet now")}
            onScheduleAppointment={() => openExpertSchedule("Schedule an appointment")}
          />
          {schedulePhase === "booked" && !appointmentScreenOpen && appointment && meetLabel && (
            <ExpertReviewScheduleBooked meetLabel={meetLabel} appointment={appointment} />
          )}
          {schedulePhase === "declined" && altChoice === null && (
            <ExpertReviewScheduleAlternative
              onContinueOnOwn={() => setAltChoice("own")}
              onShowBreakdown={() => {
                setAltChoice("breakdown");
                setFollowUp("breakdown");
                onBreakdown?.();
              }}
            />
          )}
          {schedulePhase === "declined" && altChoice === "own" && (
            <div className="post-call-replies etrade-flow--fade-in">
              <span className="chosen-chip">Continue on my own</span>
            </div>
          )}
        </>
      ) : (
        <div className="post-call-replies">
          {REFUND_OUTCOME_REPLY_OPTIONS.map((label) => (
            <ReplyChip
              key={label}
              label={label}
              disabled={followUp !== null}
              onClick={() => {
                if (label === "Get an Expert Review") {
                  setFollowUp("expert-review");
                  onExpertReview?.();
                  return;
                }
                if (label === "Show me a breakdown") {
                  setFollowUp("breakdown");
                  onBreakdown?.();
                  return;
                }
                if (label === "Pay and file") {
                  setFollowUp("pay-and-file");
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
