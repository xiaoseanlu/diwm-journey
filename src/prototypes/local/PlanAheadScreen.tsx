import "./plan-ahead.css";

function TrendUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2 8.5L5.5 5 8 7 10 3"
        stroke="#00a63e"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 3H10V5.5"
        stroke="#00a63e"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 1.5v2M7 10.5v2M1.5 7h2M10.5 7h2M3.05 3.05l1.41 1.41M9.54 9.54l1.41 1.41M3.05 10.95l1.41-1.41M9.54 4.46l1.41-1.41"
        stroke="#6a7282"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="7.25" stroke="#275582" strokeWidth="1.25" />
      <path d="M9 8v4.5" stroke="#275582" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="9" cy="5.75" r="0.85" fill="#275582" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20.25s-6.75-4.35-6.75-9.45C5.25 8.1 7.35 6 9.75 6c1.35 0 2.55.675 3.25 1.725.7-1.05 1.9-1.725 3.25-1.725 2.4 0 4.5 2.1 4.5 4.8 0 5.1-6.75 9.45-6.75 9.45Z"
        stroke="#21612c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Post-approval “Plan ahead for next year” — Figma 1646:28876. */
export function PlanAheadScreen({ onScheduleCheckIn }: { onScheduleCheckIn?: () => void }) {
  return (
    <div className="plan-ahead etrade-flow--fade-in">
      <h1 className="plan-ahead__title">Plan ahead for next year</h1>

      <section className="plan-ahead__projection" aria-label="2027 annual projection">
        <h2 className="plan-ahead__projection-heading">2027 annual projection</h2>
        <div className="plan-ahead__projection-grid">
          <div className="plan-ahead__stat">
            <p className="plan-ahead__stat-label">You earn</p>
            <p className="plan-ahead__stat-value">$120,600</p>
            <p className="plan-ahead__stat-meta plan-ahead__stat-meta--positive">
              <TrendUpIcon />
              <span>+16% YoY</span>
            </p>
          </div>
          <div className="plan-ahead__stat">
            <p className="plan-ahead__stat-label">Taxes</p>
            <p className="plan-ahead__stat-value">$33,768</p>
            <p className="plan-ahead__stat-note">28% effective rate</p>
          </div>
          <div className="plan-ahead__stat">
            <p className="plan-ahead__stat-label">You keep</p>
            <p className="plan-ahead__stat-value">$86,832</p>
          </div>
          <div className="plan-ahead__stat">
            <p className="plan-ahead__stat-label plan-ahead__stat-label--sparkle">
              <SparkleIcon />
              <span>Potential savings</span>
            </p>
            <p className="plan-ahead__stat-value-row">
              <span className="plan-ahead__stat-value plan-ahead__stat-value--savings">$2,800</span>
              <span className="plan-ahead__info-badge">
                <InfoIcon />
              </span>
            </p>
          </div>
        </div>
      </section>

      <h2 className="plan-ahead__section-title">Ways to save more</h2>

      <div className="plan-ahead__cards">
        <article className="plan-ahead__card">
          <div className="plan-ahead__card-head">
            <span className="plan-ahead__card-icon plan-ahead__card-icon--heart">
              <HeartIcon />
            </span>
            <h3 className="plan-ahead__card-title">Add to your FSA + HSA</h3>
          </div>
          <p className="plan-ahead__card-body">
            You have until <strong>June 15</strong> to take action.
          </p>
        </article>

        <article className="plan-ahead__card">
          <div className="plan-ahead__card-head">
            <span className="plan-ahead__card-icon plan-ahead__card-icon--piggy">
              <img src="images/welcome-hub/piggy-main.svg" alt="" />
            </span>
            <h3 className="plan-ahead__card-title">Contribute more to your 401(k)</h3>
          </div>
          <p className="plan-ahead__card-body">
            This can lower your taxable income and save about <strong>$3,200</strong>.
          </p>
        </article>
      </div>

      <button type="button" className="plan-ahead__cta" onClick={onScheduleCheckIn}>
        Schedule mid-year check-in
      </button>
    </div>
  );
}
