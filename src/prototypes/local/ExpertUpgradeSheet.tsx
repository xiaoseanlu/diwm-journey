import { DeviceFrameSheetPortal } from "./DeviceFrameSheetPortal";
import { DiwmPrimaryButton, DiwmSecondaryButton } from "./diwm-cds-chrome";

const UPGRADE_BENEFITS = [
  "Unlimited calls with a matched expert",
  "Expert final review before you file",
  "A team of year-round tax experts",
  "Audit protection included",
] as const;

/** Pre-match upsell — Expert Assist add-on ($19) before Ben is assigned. */
export function ExpertUpgradeSheet({
  onClose,
  onAddExpertAssist,
}: {
  onClose: () => void;
  onAddExpertAssist: () => void;
}) {
  return (
    <DeviceFrameSheetPortal className="connect-scrim" onClick={onClose}>
      <div
        className="expert-upgrade-sheet"
        role="dialog"
        aria-labelledby="expert-upgrade-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="expert-upgrade-sheet__header">
          <h2 id="expert-upgrade-title" className="expert-upgrade-sheet__title">
            Expert Assist
          </h2>
          <button type="button" className="expert-upgrade-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
              <path d="M5 5l8 8M13 5l-8 8" />
            </svg>
          </button>
        </div>

        <div className="expert-upgrade-sheet__body">
          <div className="expert-upgrade-sheet__hero">
            <img className="expert-upgrade-sheet__hero-img" src="images/experts-trio.png" alt="" />
            <p className="expert-upgrade-sheet__headline">Get unlimited expert help</p>
            <p className="expert-upgrade-sheet__sub">
              $19 to talk to an expert during tax prep and year-round. Covers all tax situations.
            </p>
          </div>

          <ul className="expert-upgrade-sheet__benefits">
            {UPGRADE_BENEFITS.map((item) => (
              <li key={item} className="expert-upgrade-sheet__benefit">
                <span className="expert-upgrade-sheet__check" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="expert-upgrade-sheet__price-card">
            <div className="expert-upgrade-sheet__price-row">
              <span className="expert-upgrade-sheet__price-label">Expert Assist add-on</span>
              <span className="expert-upgrade-sheet__price-value">$19</span>
            </div>
            <p className="expert-upgrade-sheet__price-note">Added to your return — pay only when you file</p>
          </div>
        </div>

        <div className="expert-upgrade-sheet__footer">
          <DiwmPrimaryButton label="Add Expert Assist · $19" onClick={onAddExpertAssist} className="expert-upgrade-sheet__cta w-full" />
          <DiwmSecondaryButton label="Not now" onClick={onClose} className="expert-upgrade-sheet__dismiss w-full" />
        </div>
      </div>
    </DeviceFrameSheetPortal>
  );
}
