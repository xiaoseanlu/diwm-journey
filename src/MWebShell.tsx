import { type ReactNode } from "react";
import "./mweb-shell.css";
import { SearchIcon, NotificationIcon, QuestionIcon } from "./icons";

type MWebShellProps = {
  children: ReactNode;
  progressPct?: number;
  headerRefund?: { federal: string; state: string; stateLabel?: string };
  title?: string;
  /** DIWM journey renders its own status bar + app header — hide demo shell chrome */
  immersive?: boolean;
  raceMode?: {
    elapsed?: string;
    total?: string;
    activeSection?: "my-info" | "federal" | "state" | "review";
  };
};

const SECTIONS = ["My info", "Federal", "State", "Review"];

export function MWebShell({
  children,
  progressPct = 32,
  title,
  immersive = false,
  raceMode,
}: MWebShellProps) {
  const { elapsed = "1h 35m", total = "1h 55m" } = raceMode ?? {};

  return (
    <div className="mweb-shell">
      <div className={`mweb-phone${immersive ? " mweb-phone--immersive" : ""}`}>
        {!immersive && (
          <>
            <header className="mweb-header">
              <button className="mweb-header__iconbtn" aria-label="Menu">
                <MenuIcon />
              </button>
              <div className="mweb-header__brand" aria-label="TurboTax">
                <TurboTaxCheckball />
              </div>
              <div className="mweb-header__spacer" />
              <button className="mweb-header__iconbtn" aria-label="Search">
                <SearchIcon size={20} />
              </button>
              <button className="mweb-header__iconbtn" aria-label="Help">
                <QuestionIcon size={20} />
              </button>
              <button className="mweb-header__iconbtn" aria-label="Cart">
                <CartIcon />
              </button>
              <button className="mweb-header__iconbtn" aria-label="Notifications">
                <NotificationIcon size={20} />
              </button>
              <button type="button" className="mweb-header__cta">Do my taxes</button>
            </header>

            <section className="mweb-race" aria-label="Race mode">
              <div className="mweb-race__row">
                <button
                  type="button"
                  className="mweb-race__switch mweb-race__switch--on"
                  role="switch"
                  aria-checked="true"
                  aria-label="Race mode"
                >
                  <span className="mweb-race__knob" />
                </button>
                <p className="mweb-race__time">
                  <span className="mweb-race__time-now">{elapsed}</span>
                  <span className="mweb-race__time-total"> / {total}</span>
                </p>
              </div>
              <div className="mweb-race__track" aria-hidden="true">
                <div
                  className="mweb-race__fill"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="mweb-race__segment"
                    style={{ left: `calc(${(i / 4) * 100}% - 2px)` }}
                  />
                ))}
              </div>
              <div className="mweb-race__sections">
                {SECTIONS.map((s) => (
                  <span key={s} className="mweb-race__section">{s}</span>
                ))}
              </div>
            </section>

            {title && <h1 className="mweb-section-title">{title}</h1>}
          </>
        )}

        <main className={`mweb-content${immersive ? " mweb-content--immersive" : ""}`}>{children}</main>
      </div>
    </div>
  );
}

function TurboTaxCheckball() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#D52B1E" />
      <path
        d="M9.3 16.1c-1.4-1-2.7-2-3.95-3.15-.46 1.02-.87 2.08-1.22 3.13 1.97 1.7 4.57 3.58 6.38 4.66 2.36-6.11 6.03-10.1 9.55-12.88-.45-.96-1.08-1.82-1.81-2.56-2.6 2.78-5.7 6.46-7.9 10.66Z"
        fill="white"
        transform="translate(1.5 -1)"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M18.3 4.2v5.3a1.67 1.67 0 0 1-1.56 1.65l-10.8 1.14.02.23a.83.83 0 0 0 .83.78l11.1.01a.83.83 0 1 1 0 1.67l-11.1-.01a2.67 2.67 0 0 1-2.66-2.34l-.07-1.04L2.8 2.45a.83.83 0 0 0-.84-.78H1a.83.83 0 1 1 0-1.67h.95a2.5 2.5 0 0 1 2.48 2.34l.02.17 12.17.02a1.67 1.67 0 0 1 1.68 1.66Zm-13 5.64 11.3-.68V4.2 4.17L4.9 4.16Z" />
      <circle cx="6.5" cy="18" r="1" />
      <circle cx="16.5" cy="18" r="1" />
    </svg>
  );
}
