import { ChatBubble, ReplyChip } from "./PostCallChat";

export type ScheduledAppointment = {
  dayId: number;
  slot: string;
  dayLabel: string;
};

export type ScheduleCallHandlers = {
  onBooked?: (appointment: ScheduledAppointment) => void;
  onDismissed?: () => void;
};

export const EXPERT_REVIEW_ALT_USER_REPLY = "Not right now";

export const EXPERT_REVIEW_ALT_ASSISTANT =
  "No problem — you can schedule your final review with Ben anytime before you file. Just tap Ask Ben at the bottom when you're ready.";

export const EXPERT_REVIEW_ALT_OPTIONS = [
  "Continue on my own",
  "Show me a breakdown",
] as const;

export function ExpertReviewScheduleAlternative({
  onContinueOnOwn,
  onShowBreakdown,
}: {
  onContinueOnOwn?: () => void;
  onShowBreakdown?: () => void;
}) {
  return (
    <div className="post-call-expert-review-alt etrade-flow--fade-in">
      <ChatBubble role="user">{EXPERT_REVIEW_ALT_USER_REPLY}</ChatBubble>
      <ChatBubble role="assistant">{EXPERT_REVIEW_ALT_ASSISTANT}</ChatBubble>
      <div className="post-call-replies">
        {EXPERT_REVIEW_ALT_OPTIONS.map((label) => (
          <ReplyChip
            key={label}
            label={label}
            onClick={() => {
              if (label === "Continue on my own") onContinueOnOwn?.();
              else onShowBreakdown?.();
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ExpertReviewScheduleBooked({
  meetLabel,
  appointment,
}: {
  meetLabel: string;
  appointment: ScheduledAppointment;
}) {
  return (
    <div className="post-call-expert-review-booked etrade-flow--fade-in">
      <ChatBubble role="user">{meetLabel}</ChatBubble>
      <ChatBubble role="assistant">
        You&rsquo;re all set for <strong>April {appointment.dayId}</strong> at{" "}
        <strong>{appointment.slot} PT</strong>. We&rsquo;ll call you over a one-way video.
      </ChatBubble>
    </div>
  );
}
