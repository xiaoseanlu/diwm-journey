import { StatusPillBestOutcome } from "./StatusPillBestOutcome";

const ICONS = "images/return-reviewed";

/** “Your return reviewed by Ben” — after HSA Form 8889 review, during active Ben call. Matches Figma 3271:25744. */
export function ReturnReviewedScreen({ onApproveReturn }: { onApproveReturn?: () => void }) {
  return (
    <div className="return-reviewed etrade-flow--fade-in">
      <div className="return-reviewed__hsa-banner" role="status">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#2d6a4f" />
          <path
            d="M8 12.5l2.5 2.5L16 9"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>HSA is recorded as fully covered</span>
      </div>

      <h1 className="return-reviewed__title">Your return reviewed by Ben</h1>

      <section className="return-reviewed__refund-card" aria-label="Federal refund">
        <div className="return-reviewed__refund-top">
          <p className="return-reviewed__refund-label">Your federal refund</p>
          <StatusPillBestOutcome />
        </div>
        <p className="return-reviewed__refund-amount">$2,606</p>
      </section>

      <div className="return-reviewed__guarantees">
        <div className="return-reviewed__guarantee return-reviewed__guarantee--row">
          <span className="return-reviewed__guarantee-icon">
            <img src={`${ICONS}/money-bag.svg`} alt="" />
          </span>
          <p className="return-reviewed__guarantee-text">
            Maximum Refund Guaranteed, or we&apos;ll pay any fees.
          </p>
        </div>
        <div className="return-reviewed__guarantee return-reviewed__guarantee--row">
          <span className="return-reviewed__guarantee-icon">
            <img src={`${ICONS}/file-search.svg`} alt="" />
          </span>
          <p className="return-reviewed__guarantee-text">
            Audit Defense: 100% coverage at no extra cost.
          </p>
        </div>
        <div className="return-reviewed__guarantee return-reviewed__guarantee--col">
          <span className="return-reviewed__guarantee-icon">
            <img src={`${ICONS}/goals.svg`} alt="" />
          </span>
          <div className="return-reviewed__guarantee-stack">
            <p className="return-reviewed__guarantee-title">100% Accurate</p>
            <p className="return-reviewed__guarantee-sub">IRS-compliant and verified.</p>
          </div>
        </div>
      </div>

      <section className="return-reviewed__fees" aria-label="Fees">
        <h2 className="return-reviewed__fees-heading">Fees</h2>
        <div className="return-reviewed__fee-row">
          <span className="return-reviewed__expert-assist">
            <img
              className="return-reviewed__checkball"
              src={`${ICONS}/checkball.svg`}
              alt=""
            />
            <img
              className="return-reviewed__expert-assist-logo"
              src={`${ICONS}/expert-assist.svg`}
              alt="Expert Assist"
            />
          </span>
          <span className="return-reviewed__fee-amount">$118</span>
        </div>
        <p className="return-reviewed__fee-sub">TurboTax Expert Assist 2026 Federal Filing</p>

        <div className="return-reviewed__referral">
          <span className="return-reviewed__referral-icon">
            <img src={`${ICONS}/hand-money.svg`} alt="" />
          </span>
          <p>
            Pay only $68 by referring your expert to a friend.{" "}
            <button type="button" className="return-reviewed__referral-link">
              Refer now
            </button>
          </p>
        </div>
      </section>

      <div className="return-reviewed__actions">
        <button type="button" className="return-reviewed__approve" onClick={onApproveReturn}>
          File now
        </button>
        <button type="button" className="return-reviewed__download">
          Download draft
        </button>
      </div>
    </div>
  );
}
