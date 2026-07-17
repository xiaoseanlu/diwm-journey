import type { ScheduledAppointment } from "./ExpertReviewSchedulePaths";

/** Prototype: matches design copy (“4 days” until April 4). */
export const APPOINTMENT_DAYS_UNTIL = 4;

export function formatAppointmentWhen(appointment: ScheduledAppointment): string {
  const datePart = appointment.dayLabel.replace(/, \d{4}$/, "");
  return `${datePart} at ${appointment.slot} PT`;
}

const EXPECT_ITEMS = [
  {
    icon: "tag",
    title: "Your expert breaks down your return",
    description: "Personalized explanation of your situation",
  },
  {
    icon: "doc",
    title: "Expert final review",
    description: "Ask any last questions",
  },
  {
    icon: "person",
    title: "Discuss other ways to save",
    description: "Your expert can share ways to save even more",
  },
] as const;

function ExpectIcon({ type }: { type: (typeof EXPECT_ITEMS)[number]["icon"] }) {
  if (type === "tag") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
        <path d="M7 7h.01" />
      </svg>
    );
  }
  if (type === "doc") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
        <path d="M14 2v6h6M9 13h6M9 17h4" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/** Body content only — render inside ShareDocsScreen `.screen` + HubHeader (mWeb shell). */
export function AppointmentUpcomingScreen({
  appointment,
  daysUntil = APPOINTMENT_DAYS_UNTIL,
  onEditAppointment,
  onWhatToHaveReady,
}: {
  appointment: ScheduledAppointment;
  daysUntil?: number;
  onEditAppointment: () => void;
  onWhatToHaveReady?: () => void;
}) {
  const daysLabel = daysUntil === 1 ? "1 day" : `${daysUntil} days`;

  return (
    <div className="appointment-upcoming" aria-labelledby="appointment-upcoming-title">
      <h1 id="appointment-upcoming-title" className="appointment-upcoming__title">
        Your appointment is coming up in {daysLabel}
      </h1>
      <p className="appointment-upcoming__when">{formatAppointmentWhen(appointment)}</p>
      <button type="button" className="appointment-upcoming__edit" onClick={onEditAppointment}>
        Edit appointment
      </button>

      <section className="appointment-upcoming__card" aria-labelledby="appointment-expect-heading">
        <h2 id="appointment-expect-heading" className="appointment-upcoming__card-title">
          Here&rsquo;s what to expect
        </h2>
        <ul className="appointment-upcoming__list">
          {EXPECT_ITEMS.map((item) => (
            <li key={item.title} className="appointment-upcoming__list-item">
              <span className="appointment-upcoming__list-icon">
                <ExpectIcon type={item.icon} />
              </span>
              <div className="appointment-upcoming__list-copy">
                <p className="appointment-upcoming__list-title">{item.title}</p>
                <p className="appointment-upcoming__list-desc">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="appointment-upcoming__ready-btn"
          onClick={onWhatToHaveReady}
        >
          <span className="appointment-upcoming__ready-btn-inner">What should I have ready?</span>
        </button>
      </section>
    </div>
  );
}
