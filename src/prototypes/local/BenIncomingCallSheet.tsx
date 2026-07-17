import { DeviceFrameSheetPortal } from "./DeviceFrameSheetPortal";

/** Incoming Ben video-call bottom sheet (expert final review). */
export function BenIncomingCallSheet({
  onDismiss,
  onAccept,
}: {
  onDismiss: () => void;
  onAccept?: () => void;
}) {
  return (
    <DeviceFrameSheetPortal
      className="connect-scrim connect-scrim--incoming-call"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="ben-incoming-call"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Incoming call from Ben B."
      >
        <button type="button" className="ben-incoming-call__close" onClick={onDismiss} aria-label="Decline call">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="ben-incoming-call__body">
          <img className="ben-incoming-call__photo" src="images/ben-big.png" alt="" />

          <h2 className="ben-incoming-call__name">Ben B.</h2>

          <p className="ben-incoming-call__rating">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            4.9 (418)
          </p>
          <p className="ben-incoming-call__experience">13 yrs experience</p>

          <img
            className="ben-incoming-call__available"
            src="images/available-now-pill.png"
            alt="Available now"
            width={108}
            height={26}
          />

          <p className="ben-incoming-call__skilled-label">Expertly skilled in:</p>
          <div className="ben-incoming-call__skills">
            {["W-2", "Investments", "Multi-state taxes", "WA taxes"].map((skill) => (
              <span key={skill} className="ben-incoming-call__skill">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="ben-incoming-call__actions">
          <button type="button" className="ben-incoming-call__action" aria-label="Mute">
            <span className="ben-incoming-call__action-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </span>
          </button>

          <button type="button" className="ben-incoming-call__action" aria-label="Share screen">
            <span className="ben-incoming-call__action-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 8l5 4 5-4" />
              </svg>
            </span>
          </button>

          <button
            type="button"
            className="ben-incoming-call__accept-wrap"
            onClick={() => onAccept?.()}
            aria-label="Answer call"
          >
            <span className="ben-incoming-call__accept-ring ben-incoming-call__accept-ring--1" aria-hidden />
            <span className="ben-incoming-call__accept-ring ben-incoming-call__accept-ring--2" aria-hidden />
            <span className="ben-incoming-call__accept">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </DeviceFrameSheetPortal>
  );
}
