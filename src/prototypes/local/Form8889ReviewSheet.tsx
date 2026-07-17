import { DeviceFrameSheetPortal } from "./DeviceFrameSheetPortal";

const HSA_LINES = [
  { n: 1, label: "Self-only HDHP coverage", value: "$4,300" },
  { n: 2, label: "Family HDHP coverage", value: "$0.00" },
  { n: 3, label: "Catch-up contribution", value: "$0.00" },
  { n: 12, label: "Code W", value: "$0.00" },
] as const;

function MoneyBagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2C10.5 2 9.5 3 9 4.5 7.5 4.8 6 6.2 6 8v1.5C4.3 10.2 3 11.9 3 14v4c0 2.2 1.8 4 4 4h10c2.2 0 4-1.8 4-4v-4c0-2.1-1.3-3.8-3-4.5V8c0-1.8-1.5-3.2-3-3.5C14.5 3 13.5 2 12 2Z"
        stroke="#1a1a1a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 14h6" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
      <text x="12" y="13.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1a1a1a">
        $
      </text>
    </svg>
  );
}

/** HSA Form 8889 review bottom sheet (expert call + deductions flow). */
export function Form8889ReviewSheet({ onClose }: { onClose: () => void }) {
  return (
    <DeviceFrameSheetPortal className="review-scrim" onClick={onClose}>
      <div
        className="form8889-sheet review-sheet--animate"
        role="dialog"
        aria-labelledby="form8889-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="review-sheet__header">
          <span id="form8889-title" className="review-sheet__title">
            Form 8889 Review
          </span>
          <button type="button" className="review-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="form8889-sheet__body">
          <div className="form8889-sheet__tip">
            <MoneyBagIcon />
            <p>
              Max out your HSA to save ~$1k in taxes. You have until 4/15 to make a contribution.
            </p>
          </div>

          <h2 className="form8889-sheet__heading">Your 2026 HSA contribution</h2>

          <div className="form8889-sheet__lines">
            {HSA_LINES.map((line) => (
              <div key={line.n} className="review-line">
                <span className="review-line__num">{line.n}</span>
                <span className="review-line__label">{line.label}</span>
                <span className="review-line__value">{line.value}</span>
              </div>
            ))}
          </div>

          <p className="form8889-sheet__autofill">
            <img className="form8889-sheet__sparkle" src="images/intuit-intelligence.png" alt="" width={20} height={20} />
            These numbers were auto-filled from your form 8889. Make any necessary changes.
          </p>
        </div>

        <div className="form8889-sheet__actions">
          <button type="button" className="review-sheet__edit" onClick={onClose}>
            Edit
          </button>
          <div className="form8889-sheet__question-wrap">
            <button type="button" className="form8889-sheet__question" onClick={onClose}>
              I have a question
            </button>
          </div>
        </div>
      </div>
    </DeviceFrameSheetPortal>
  );
}
