import { type ReactNode } from "react";
import "./shell.css";
import { Tooltip } from "./Tooltip";
import {
  TurboTaxDIYLogo,
  SearchIcon,
  NotificationIcon,
  QuestionIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
} from "./icons";

type NavStatus = "done" | "in-progress" | "pending";

type ShellProps = {
  children: ReactNode;
  selectedNav?: string; // e.g. "Wages & income", "Federal review", "File"
  progressPct?: number; // 0–100
  sku?: string; // e.g. "Free edition", "Premium"
  federalExpanded?: boolean; // default true — collapse when we're past Federal
  showFooter?: boolean;
  headerRefund?: { federal: string; state: string; stateLabel?: string };
  statuses?: Record<string, NavStatus>; // keyed by top-level nav item
};

const DEFAULT_STATUSES: Record<string, NavStatus> = {
  "My info": "done",
  "Federal": "in-progress",
  "State": "pending",
  "Final review": "pending",
  "File": "pending",
};

const federalChildren = ["Income", "Deductions & credits", "Other tax situations", "Federal review"];

export function Shell({
  children,
  selectedNav = "Income",
  progressPct = 32,
  sku = "Free edition",
  federalExpanded = true,
  showFooter = false,
  headerRefund = { federal: "$3,453", state: "$235", stateLabel: "CA due" },
  statuses = DEFAULT_STATUSES,
}: ShellProps) {
  const mergedStatuses = { ...DEFAULT_STATUSES, ...statuses };
  const isSelected = (label: string) => label === selectedNav;

  return (
    <div className="shell">
      <aside className="leftnav">
        <div className="leftnav__brand">
          <TurboTaxDIYLogo size={103} className="leftnav__logo" />
          <div className="leftnav__sku">{sku}</div>
        </div>

        <div className="leftnav__item">Tax home</div>
        <div className="leftnav__item">Documents</div>

        <div className="leftnav__section-label">2025 Taxes</div>

        <NavItem
          label="My info"
          status={mergedStatuses["My info"]}
          selected={isSelected("My info")}
        />

        <NavItem
          label="Federal"
          status={mergedStatuses["Federal"]}
          selected={isSelected("Federal")}
          chevronDirection={federalExpanded ? "up" : "down"}
          active
        />

        {federalExpanded &&
          federalChildren.map((child) => (
            <div
              key={child}
              className={`leftnav__item leftnav__item--child ${
                isSelected(child) ? "leftnav__item--selected" : ""
              }`}
            >
              {child}
            </div>
          ))}

        {!federalExpanded && (
          <></>
        )}

        <NavItem
          label="State"
          status={mergedStatuses["State"]}
          selected={isSelected("State")}
        />
        <NavItem
          label="Final review"
          status={mergedStatuses["Final review"]}
          selected={isSelected("Final review")}
        />
        <NavItem
          label="File"
          status={mergedStatuses["File"]}
          selected={isSelected("File")}
        />

        <div className="leftnav__divider" />

        <div className="leftnav__item">
          Tax tools <ChevronDownIcon size={12} className="leftnav__chevron" />
        </div>
        <div className="leftnav__item">
          Switch products <ChevronDownIcon size={12} className="leftnav__chevron" />
        </div>
        <div className="leftnav__item leftnav__item--with-badge">
          Refer &amp; earn
          <span className="leftnav__badge">EARN $25</span>
        </div>

        <div className="leftnav__spacer" />

        <div className="leftnav__item">Intuit account</div>
        <div className="leftnav__item">Cambiar a español</div>
        <div className="leftnav__item">Sign out</div>
      </aside>

      <div className="main">
        <header className="header">
          <div className="refund-monitor">
            <div className="refund-monitor__item">
              <span className="refund-monitor__label">Federal refund</span>
              <span
                className={`refund-monitor__value ${
                  headerRefund.federal === "$0" || headerRefund.federal === "$0.00"
                    ? "refund-monitor__value--positive"
                    : "refund-monitor__value--positive"
                }`}
              >
                {headerRefund.federal}
              </span>
            </div>
            <div className="refund-monitor__item">
              <span className="refund-monitor__label">{headerRefund.stateLabel ?? "State"}</span>
              <span className="refund-monitor__value refund-monitor__value--positive">
                {headerRefund.state}
              </span>
            </div>
            <span className="refund-monitor__link">Explain my taxes</span>
            <ChevronLeftIcon size={10} className="refund-monitor__chevron" />
          </div>

          <div className="header__search">
            <SearchIcon size={16} className="header__search-icon" />
            <span className="header__search-text">Search</span>
          </div>

          <div className="header__nav">
            <Tooltip
              content="See updates, reminders, and tax deadlines for your return."
              placement="bottom"
              align="center"
            >
              <span className="header__nav-item" tabIndex={0}>
                <NotificationIcon size={18} className="header__nav-icon" />
                <span>Notifications</span>
              </span>
            </Tooltip>
            <Tooltip
              content="Search tax topics, get step-by-step guidance, or contact support."
              placement="bottom"
              align="center"
            >
              <span className="header__nav-item" tabIndex={0}>
                <QuestionIcon size={18} className="header__nav-icon" />
                <span>Help</span>
              </span>
            </Tooltip>
            <Tooltip
              content="Hand off your taxes to a TurboTax tax expert, or get unlimited advice while you file."
              placement="bottom"
              align="right"
            >
              <button className="header__cta">Get expert help</button>
            </Tooltip>
          </div>
        </header>

        <main className="content">{children}</main>

        {showFooter && (
          <footer className="footer">
            <div className="footer__links">
              <span>License Agreement</span>
              <span>Privacy</span>
              <span>Manage cookies</span>
              <span>Security</span>
              <span>Cobrowse</span>
              <span>Give feedback</span>
            </div>
            <div className="footer__copy">© 2026 Intuit Inc. All rights reserved.</div>
          </footer>
        )}

        {/* Keep progress bar space reserved, but the Finish & File screens don't use it */}
        {progressPct > 0 && progressPct < 100 && false}
      </div>
    </div>
  );
}

function NavItem({
  label,
  status,
  selected,
  chevronDirection,
  active,
}: {
  label: string;
  status: NavStatus;
  selected: boolean;
  chevronDirection?: "up" | "down";
  active?: boolean;
}) {
  return (
    <div
      className={`leftnav__item ${selected ? "leftnav__item--selected" : ""} ${
        active ? "leftnav__item--active" : ""
      }`}
    >
      <span className="leftnav__item-left">
        <StatusIcon status={status} />
        <span>{label}</span>
      </span>
      {chevronDirection && (
        <ChevronDownIcon
          size={12}
          className={`leftnav__chevron ${
            chevronDirection === "up" ? "leftnav__chevron--up" : ""
          }`}
        />
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: NavStatus }) {
  if (status === "done") {
    return (
      <svg
        className="nav-status nav-status--done"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="9" fill="var(--color-ui-positive)" />
        <path
          d="M5.5 9.2 l2.3 2.3 L12.7 6.3"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "in-progress") {
    // Partial green ring — indicates work in progress
    return (
      <svg
        className="nav-status nav-status--progress"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
      >
        <circle
          cx="9"
          cy="9"
          r="7"
          fill="none"
          stroke="var(--color-container-border-primary)"
          strokeWidth="2"
        />
        <path
          d="M 9 2 A 7 7 0 0 1 16 9"
          fill="none"
          stroke="var(--color-ui-positive)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Pending — dashed circle
  return (
    <svg
      className="nav-status nav-status--pending"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="var(--color-text-tertiary)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
    </svg>
  );
}
