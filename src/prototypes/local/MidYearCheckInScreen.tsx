import type { ReactNode } from "react";
import "./mid-year-check-in.css";

const ASSETS = {
  storeHero: "images/mid-year-check-in/store-hero.png",
  expertBen: "images/ben.png",
  avatarRingLg: "images/mid-year-check-in/avatar-ring-large.svg",
  avatarRingSm: "images/mid-year-check-in/avatar-ring-small.svg",
  expertFranklin: "images/mid-year-check-in/expert-franklin.png",
  expertDaniela: "images/mid-year-check-in/expert-daniela.png",
  star: "images/mid-year-check-in/star-fill.svg",
  mapPin: "images/mid-year-check-in/map-pin.svg",
  sparkle: "images/mid-year-check-in/ai-sparkle.svg",
  checklistEmpty: "images/mid-year-check-in/checklist-empty.svg",
  document: "images/mid-year-check-in/document.svg",
  handMoney: "images/return-reviewed/hand-money.svg",
  ckLogo: "images/cds-ck-logo.svg",
  chevronRight: "images/mid-year-check-in/chevron-right.svg",
} as const;

function DoneCheckIcon() {
  return (
    <svg
      className="mid-year__check-icon"
      width="12"
      height="9"
      viewBox="0 0 12.2629 8.73798"
      fill="none"
      aria-hidden
    >
      <path
        d="M12.0189 0.243992C11.8627 0.0877666 11.6507 0 11.4297 0C11.2088 0 10.9969 0.0877666 10.8406 0.243992L4.35893 6.72565L1.41227 3.77982C1.2551 3.62807 1.04459 3.54407 0.826098 3.5459C0.607598 3.54782 0.39859 3.63548 0.244082 3.78998C0.0895732 3.94448 0.00193154 4.15348 3.15437e-05 4.37198C-0.00186846 4.59048 0.0821317 4.80098 0.233932 4.95815L3.76977 8.49398C3.92603 8.65023 4.13796 8.73798 4.35893 8.73798C4.57991 8.73798 4.79182 8.65023 4.94807 8.49398L12.0189 1.42233C12.1752 1.26605 12.2629 1.05413 12.2629 0.833158C12.2629 0.612192 12.1752 0.400267 12.0189 0.243992Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

type NextStepRowProps = {
  icon: ReactNode;
  label: string;
  variant?: "default" | "referral" | "team";
  onClick?: () => void;
};

function NextStepRow({ icon, label, variant = "default", onClick }: NextStepRowProps) {
  const className = `mid-year__next-row mid-year__next-row--${variant}${onClick ? " mid-year__next-row--clickable" : ""}`;

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <span className="mid-year__next-icon">{icon}</span>
        <span className="mid-year__next-label">{label}</span>
      </button>
    );
  }

  return (
    <div className={className}>
      <span className="mid-year__next-icon">{icon}</span>
      <p className="mid-year__next-label">{label}</p>
    </div>
  );
}

function ExpertTeamAvatars() {
  return (
    <div className="mid-year__team-avatars" aria-hidden>
      <span className="mid-year__team-avatar mid-year__team-avatar--ben">
        <img src={ASSETS.avatarRingSm} alt="" className="mid-year__team-ring" />
        <img src={ASSETS.expertBen} alt="" className="mid-year__team-photo" />
      </span>
      <span className="mid-year__team-avatar mid-year__team-avatar--franklin">
        <img src={ASSETS.avatarRingSm} alt="" className="mid-year__team-ring" />
        <img src={ASSETS.expertFranklin} alt="" className="mid-year__team-photo" />
      </span>
      <span className="mid-year__team-avatar mid-year__team-avatar--daniela">
        <img src={ASSETS.avatarRingSm} alt="" className="mid-year__team-ring" />
        <img src={ASSETS.expertDaniela} alt="" className="mid-year__team-photo" />
      </span>
    </div>
  );
}

/** Mid-year check-in scheduled — Figma 1646:29454. */
export function MidYearCheckInScreen({ onOpenReferral }: { onOpenReferral?: () => void }) {
  return (
    <div className="mid-year etrade-flow--fade-in">
      <section className="mid-year__expert" aria-label="Your expert">
        <div className="mid-year__hero-wrap">
          <img src={ASSETS.storeHero} alt="" className="mid-year__hero" />
          <div className="mid-year__avatar">
            <img src={ASSETS.avatarRingLg} alt="" className="mid-year__avatar-ring" />
            <img src={ASSETS.expertBen} alt="" className="mid-year__avatar-photo" />
          </div>
        </div>

        <div className="mid-year__expert-meta">
          <div className="mid-year__expert-name-row">
            <h1 className="mid-year__expert-name">Ben Carter</h1>
            <span className="mid-year__dot" aria-hidden />
            <div className="mid-year__rating">
              <img src={ASSETS.star} alt="" className="mid-year__star" />
              <span>
                4.9 <span className="mid-year__rating-count">(79)</span>
              </span>
            </div>
          </div>
          <p className="mid-year__expert-detail">
            <span>12 yrs experience</span>
            <span className="mid-year__dot mid-year__dot--inline" aria-hidden />
            <span>Available in store and online</span>
          </p>
        </div>
      </section>

      <section className="mid-year__appointment" aria-label="Your appointment details">
        <h2 className="mid-year__section-heading">Your appointment details</h2>
        <div className="mid-year__appointment-card">
          <p className="mid-year__appointment-lead">Ben will meet with you at:</p>
          <div className="mid-year__location">
            <img src={ASSETS.mapPin} alt="" className="mid-year__map-pin" />
            <span className="mid-year__location-name">TurboTax Seattle Downtown</span>
          </div>
          <p className="mid-year__appointment-time">Monday, July 14 at 9:45 AM PT</p>
          <button type="button" className="mid-year__manage-btn">
            Manage appointment
          </button>
        </div>
      </section>

      <section className="mid-year__action-card" aria-label="Your action items">
        <div className="mid-year__action-body">
          <div className="mid-year__action-intro">
            <div className="mid-year__auto-badge">
              <img src={ASSETS.sparkle} alt="" className="mid-year__auto-sparkle" />
              <span>Auto-summarized</span>
            </div>
            <h2 className="mid-year__action-title">Your action items</h2>
          </div>

          <ul className="mid-year__checklist">
            <li className="mid-year__checklist-item">
              <span className="mid-year__check-wrap" aria-hidden>
                <span className="mid-year__check mid-year__check--done">
                  <DoneCheckIcon />
                </span>
              </span>
              <span className="mid-year__checklist-text">Scheduled mid-year check in</span>
            </li>
            <li className="mid-year__checklist-item">
              <span className="mid-year__check-slot" aria-hidden>
                <img src={ASSETS.checklistEmpty} alt="" className="mid-year__check--empty" />
              </span>
              <span className="mid-year__checklist-text">Keep receipts from home projects</span>
            </li>
            <li className="mid-year__checklist-item">
              <span className="mid-year__check-slot" aria-hidden>
                <img src={ASSETS.checklistEmpty} alt="" className="mid-year__check--empty" />
              </span>
              <span className="mid-year__checklist-text">
                Confirm if CA withholdings were paused after move to WA
              </span>
            </li>
          </ul>
        </div>

        <button type="button" className="mid-year__summary-link">
          <span className="mid-year__summary-label">View conversation summary</span>
          <img src={ASSETS.chevronRight} alt="" className="mid-year__summary-chevron" />
        </button>
      </section>

      <h2 className="mid-year__section-heading mid-year__section-heading--next">Next steps</h2>

      <div className="mid-year__next-steps">
        <NextStepRow
          icon={<img src={ASSETS.document} alt="" />}
          label="Review tax strategies"
        />
        <NextStepRow
          icon={<img src={ASSETS.ckLogo} alt="" className="mid-year__ck-logo" />}
          label="Review financial insights"
        />
        <NextStepRow
          variant="referral"
          icon={<img src={ASSETS.handMoney} alt="" />}
          label="Earn $50 by referring a friend"
          onClick={onOpenReferral}
        />
        <NextStepRow
          variant="team"
          icon={<ExpertTeamAvatars />}
          label="Meet your expert team"
        />
      </div>
    </div>
  );
}
