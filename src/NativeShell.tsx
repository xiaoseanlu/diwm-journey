import { type ReactNode } from "react";
import "./native-shell.css";
import helpAvatarUrl from "./icons/fab-help-avatar.png";

export type Refund = {
  label: string;
  amount: string;
  tone?: "positive" | "neutral";
};

type TabKey = "home" | "documents" | "learn" | "more";

type NativeShellProps = {
  children: ReactNode;
  platform?: "ios" | "android";
  mode?: "tax-home" | "tax-prep";
  refunds?: Refund[];
  activeTab?: TabKey;
  onBack?: () => void;
  onHelp?: () => void;
  raceMode?: {
    elapsed?: string;
    total?: string;
    progress?: number;
    sections?: number;
  };
};

export function NativeShell({
  children,
  platform = "ios",
  mode = "tax-home",
  refunds,
  activeTab = "home",
  onBack,
  onHelp,
  raceMode,
}: NativeShellProps) {
  const isTaxHome = mode === "tax-home";
  const resolvedRefunds: Refund[] = refunds ?? [
    { label: "Federal refund", amount: "$3,453", tone: "positive" },
    { label: "NM due", amount: "$235", tone: "neutral" },
    { label: "NV refund", amount: "$425", tone: "positive" },
    { label: "TX refund", amount: "$3,453", tone: "positive" },
  ];

  return (
    <div className={`native-shell native-shell--${platform} native-shell--${mode}`}>
      <div className="native-device">
        {platform === "ios" ? <IOSStatusBar /> : <AndroidStatusBar />}

        <ProductHeader mode={mode} onBack={onBack} />

        {isTaxHome && <RefundMonitor refunds={resolvedRefunds} />}

        {!isTaxHome && <RaceModeBar {...(raceMode ?? {})} />}

        <main className="native-content">{children}</main>

        {!isTaxHome && <FloatingHelpFab onHelp={onHelp} />}

        {isTaxHome && <BottomTabNav activeTab={activeTab} onHelp={onHelp} />}

        {platform === "ios" ? <IOSHomeIndicator /> : <AndroidGestureBar />}
      </div>
    </div>
  );
}

// ===== Status bars =====

function IOSStatusBar() {
  return (
    <div className="native-statusbar native-statusbar--ios">
      <div className="native-statusbar__left">
        <span className="native-statusbar__time">9:41</span>
      </div>
      <div className="native-statusbar__island" aria-hidden="true" />
      <div className="native-statusbar__right">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

function AndroidStatusBar() {
  return (
    <div className="native-statusbar native-statusbar--android">
      <span className="native-statusbar__time">9:41</span>
      <div className="native-statusbar__right">
        <AndroidSignalIcon />
        <AndroidWifiIcon />
        <AndroidBatteryIcon />
      </div>
    </div>
  );
}

// ===== Product header =====

function ProductHeader({ mode, onBack }: { mode: "tax-home" | "tax-prep"; onBack?: () => void }) {
  const isTaxPrep = mode === "tax-prep";
  return (
    <header className="native-header">
      <div className="native-header__left">
        {isTaxPrep ? (
          <button
            type="button"
            className="native-header__icon-btn"
            onClick={
              onBack ??
              (() => {
                const route = window.location.hash.replace(/^#\/?/, "").split("/");
                const platform = route[1];
                if (platform === "ios" || platform === "android") {
                  window.location.hash = `#/tax-home/${platform}`;
                } else {
                  window.location.hash = "";
                }
              })
            }
            aria-label="Home"
          >
            <HomeIcon />
          </button>
        ) : (
          <CheckballLogo />
        )}
      </div>
      <div className="native-header__right">
        <button type="button" className="native-header__icon-btn" aria-label="Search">
          <SearchIcon />
        </button>
        {isTaxPrep ? (
          <>
            <button type="button" className="native-header__icon-btn" aria-label="Notifications">
              <BellIcon />
            </button>
            <button type="button" className="native-header__expert">Live tax advice</button>
          </>
        ) : (
          <>
            <button type="button" className="native-header__icon-btn" aria-label="Cart">
              <CartIcon />
            </button>
            <button type="button" className="native-header__expert">Get expert help</button>
          </>
        )}
      </div>
    </header>
  );
}

// ===== Race mode bar (tax-prep only) =====

function RaceModeBar({
  elapsed = "1h 35m",
  total = "1h 55m",
  progress = 0.62,
  sections = 4,
}: {
  elapsed?: string;
  total?: string;
  progress?: number;
  sections?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <section className="native-race" aria-label="Race mode">
      <div className="native-race__row">
        <div className="native-race__left">
          <button
            type="button"
            className="native-race__switch native-race__switch--on"
            role="switch"
            aria-checked="true"
            aria-label="Race mode"
          >
            <span className="native-race__knob" />
          </button>
          <div className="native-race__time">
            <span className="native-race__time-now">{elapsed}</span>
            <span className="native-race__time-total"> / {total}</span>
          </div>
        </div>
        <button type="button" className="native-race__navigate">
          Navigate
          <ChevronDownMiniIcon />
        </button>
      </div>
      <div className="native-race__track" aria-hidden="true">
        <div
          className="native-race__fill"
          style={{ width: `${clamped * 100}%` }}
        />
        {Array.from({ length: Math.max(0, sections - 1) }).map((_, i) => (
          <span
            key={i}
            className="native-race__segment"
            style={{ left: `calc(${((i + 1) / sections) * 100}% - 2px)` }}
          />
        ))}
      </div>
    </section>
  );
}

// ===== Refund monitor (tax-home only) =====

function RefundMonitor({ refunds }: { refunds: Refund[] }) {
  return (
    <section className="native-refunds" aria-label="Refund status">
      <div className="native-refunds__row">
        {refunds.map((r, i) => (
          <div className="native-refund" key={`${r.label}-${i}`}>
            <div className="native-refund__label">{r.label}</div>
            <div
              className={`native-refund__amount native-refund__amount--${r.tone ?? "positive"}`}
            >
              {r.amount}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="native-refunds__collapse" aria-label="Collapse refund monitor">
        <ChevronUpIcon />
      </button>
    </section>
  );
}

// ===== Bottom tab nav (tax-home only) =====

function BottomTabNav({ activeTab, onHelp }: { activeTab: TabKey; onHelp?: () => void }) {
  return (
    <nav className="native-tabbar" aria-label="Primary">
      <TabItem label="Home" tabKey="home" active={activeTab === "home"} icon={<TabHomeIcon />} />
      <TabItem
        label="Documents"
        tabKey="documents"
        active={activeTab === "documents"}
        icon={<TabDocumentsIcon />}
      />
      <TabItem label="Learn" tabKey="learn" active={activeTab === "learn"} icon={<TabLearnIcon />} />
      <TabItem label="More" tabKey="more" active={activeTab === "more"} icon={<TabMoreIcon />} />
      <div className="native-tabbar__fab-slot">
        <HelpFab onHelp={onHelp} />
      </div>
    </nav>
  );
}

function TabItem({
  label,
  active,
  icon,
}: {
  label: string;
  tabKey: TabKey;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`native-tab ${active ? "native-tab--active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="native-tab__icon">{icon}</span>
      <span className="native-tab__label">{label}</span>
    </button>
  );
}

// ===== Help FAB (two modes) =====

function HelpFab({ onHelp }: { onHelp?: () => void }) {
  return (
    <button type="button" className="native-fab native-fab--tabbar" onClick={onHelp} aria-label="Help">
      <HelpAvatar />
      <span className="native-fab__banner">Help</span>
    </button>
  );
}

function FloatingHelpFab({ onHelp }: { onHelp?: () => void }) {
  return (
    <button
      type="button"
      className="native-fab native-fab--floating"
      onClick={onHelp}
      aria-label="Help"
    >
      <HelpAvatar />
      <span className="native-fab__banner">Help</span>
    </button>
  );
}

// ===== iOS home indicator / Android gesture bar =====

function IOSHomeIndicator() {
  return <div className="native-home-indicator native-home-indicator--ios" aria-hidden="true" />;
}

function AndroidGestureBar() {
  return <div className="native-home-indicator native-home-indicator--android" aria-hidden="true" />;
}

// ===== Inline icons (extracted from Figma MCP SVGs) =====

function CheckballLogo() {
  return (
    <div className="native-header__logo" aria-label="TurboTax">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="12" fill="#D52B1E" />
        <path
          d="M9.13 15.87c-1.38-.99-2.71-2.06-3.98-3.18-.47 1.02-.89 2.07-1.26 3.14 2.03 1.72 4.74 3.68 6.6 4.79 2.41-6.23 6.17-10.3 9.77-13.14-.46-.98-1.09-1.86-1.85-2.62C14.55 7.81 11.37 11.57 9.1 15.87Z"
          fill="#FFFFFF"
          transform="translate(3.5 2)"
        />
      </svg>
    </div>
  );
}

export function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18 L9 12 L15 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 17 17" fill="currentColor" aria-hidden="true">
      <path d="M16.5 15.35L12 10.86c1.06-1.35 1.56-3.04 1.4-4.75a6.75 6.75 0 0 0-2.23-4.42A6.71 6.71 0 0 0 6.53 0a6.72 6.72 0 0 0-4.55 1.95A6.72 6.72 0 0 0 0 6.48c-.06 1.71.53 3.38 1.67 4.66a6.74 6.74 0 0 0 4.4 2.26c1.7.17 3.4-.32 4.75-1.36l4.49 4.5a.83.83 0 0 0 1.18 0 .84.84 0 0 0 0-1.19ZM3.2 10.3a5.08 5.08 0 0 1-1.08-5.45 5.08 5.08 0 0 1 4.62-3.08 5.08 5.08 0 0 1 4.69 3.08 5.08 5.08 0 0 1-1.07 5.45 5.06 5.06 0 0 1-7.16 0Z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 17" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M15.83 4.19v4.97a1.67 1.67 0 0 1-1.56 1.66L4.86 11.5l.02.23a.83.83 0 0 0 .83.78l9.27.01a.83.83 0 1 1 0 1.67l-9.27-.01a2.67 2.67 0 0 1-2.66-2.34l-.07-1.04v-.01L2.61 2.45a.83.83 0 0 0-.84-.78H.83a.83.83 0 1 1 0-1.67h.95a2.5 2.5 0 0 1 2.48 2.34l.01.17 9.88.02a1.67 1.67 0 0 1 1.68 1.66ZM4.76 9.84l9.4-.68V4.19 4.17l-9.77-.01.37 5.68Z"
      />
      <circle cx="5.81" cy="15.83" r=".84" />
      <circle cx="14.15" cy="15.84" r=".84" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" fill="currentColor" aria-hidden="true">
      <path d="M13.01 8a1 1 0 0 1-.71-.3L7.02 2.42l-5.3 5.28A1 1 0 1 1 .31 6.28L6.31.3a1 1 0 0 1 1.41 0l6 6a1 1 0 0 1-.71 1.7Z" />
    </svg>
  );
}

function TabHomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M19.48 6.18 10.49.17a1 1 0 0 0-1.1 0L.38 6.16a1 1 0 1 0 1.1 1.66l.44-.29-.02 11.46a1 1 0 0 0 1 1l4 .01a1 1 0 0 0 1-1l.01-4a2 2 0 0 1 4 0l-.01 4a1 1 0 0 0 1 1l4 .01a1 1 0 0 0 1-1l.02-11.45.45.29a1 1 0 1 0 1.11-1.66Z" />
    </svg>
  );
}

function TabDocumentsIcon() {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" fill="currentColor" aria-hidden="true">
      <path d="M17 3h-6.28l-.32-.95A2.5 2.5 0 0 0 7.56 0H3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3ZM3 2h4.56a.5.5 0 0 1 .47.32l.54 1.63a1 1 0 0 0 .95.68H17a1 1 0 0 1 1 1v1.18c-.32-.12-.66-.18-1-.18H3c-.34 0-.68.06-1 .18V3a1 1 0 0 1 1-1Zm15 13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5Z" />
    </svg>
  );
}

function TabLearnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
      <path d="M11 3.82a1 1 0 0 0 1-1V1a1 1 0 1 0-2 0v1.82a1 1 0 0 0 1 1Z" />
      <path d="M5.92 5.92a1 1 0 0 0 0-1.41L4.64 3.22a1 1 0 0 0-1.42 1.42l1.29 1.28a1 1 0 0 0 1.41 0ZM2.82 10H1a1 1 0 1 0 0 2h1.82a1 1 0 1 0 0-2ZM21 10h-1.82a1 1 0 1 0 0 2H21a1 1 0 1 0 0-2ZM18.78 3.22a1 1 0 0 0-1.42 0l-1.28 1.29a1 1 0 1 0 1.41 1.41l1.29-1.28a1 1 0 0 0 0-1.42Z" />
      <path d="M11 4.55a6.45 6.45 0 0 0-4.03 11.48.9.9 0 0 1 .3.63v2.52A2.82 2.82 0 0 0 10.1 22h1.82a2.82 2.82 0 0 0 2.82-2.82v-2.52a.9.9 0 0 1 .3-.63A6.45 6.45 0 0 0 11 4.55Zm.91 15.45H10.1a.82.82 0 0 1-.82-.82V17.8h3.45v1.38a.82.82 0 0 1-.82.82Zm1.88-5.53a3.18 3.18 0 0 0-.9 1.33H12v-1.83a2.49 2.49 0 0 0 1.82-2.42 1 1 0 1 0-2 0 .82.82 0 1 1-1.64 0 1 1 0 1 0-2 0 2.49 2.49 0 0 0 1.82 2.42V15.8H9.12a3.18 3.18 0 0 0-.9-1.33 4.46 4.46 0 1 1 5.57 0Z" />
    </svg>
  );
}

function TabMoreIcon() {
  return (
    <svg width="20" height="4" viewBox="0 0 16 4" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="2" r="2" />
      <circle cx="8" cy="2" r="2" />
      <circle cx="14" cy="2" r="2" />
    </svg>
  );
}

function HelpAvatar() {
  return (
    <div className="native-fab__avatar" aria-hidden="true">
      <img src={helpAvatarUrl} alt="" className="native-fab__avatar-img" />
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5 L12 3 L21 10.5 V20 a1 1 0 0 1 -1 1 h-5 v-6 h-4 v6 H4 a1 1 0 0 1 -1 -1 Z"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 2.5a4 4 0 0 0-4 4V9c0 1.1-.4 2.2-1.1 3l-.6.7c-.3.3-.5.7-.5 1.2 0 .9.8 1.7 1.7 1.7h9c1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2l-.6-.7a4 4 0 0 1-1.1-3V6.5a4 4 0 0 0-4-4Zm0 14.5a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2Z" />
    </svg>
  );
}

function ChevronDownMiniIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M7 9.3 2.9 5.2a.9.9 0 1 1 1.3-1.3L7 6.7l2.8-2.8a.9.9 0 1 1 1.3 1.3L7 9.3Z" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="0.5" opacity="0.9" />
      <rect x="5" y="6" width="3" height="6" rx="0.5" opacity="0.9" />
      <rect x="10" y="3" width="3" height="9" rx="0.5" opacity="0.9" />
      <rect x="15" y="0" width="3" height="12" rx="0.5" opacity="0.9" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
      <path d="M8.5 1.5 A10 10 0 0 1 16.5 4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M8.5 4.5 A7 7 0 0 1 13.5 6.8" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M8.5 7.5 A4 4 0 0 1 11 9" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="8.5" cy="10" r="1" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="28" height="13" viewBox="0 0 28 13" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="24" height="12" rx="3" stroke="currentColor" strokeOpacity="0.5" />
      <rect x="2" y="2" width="21" height="9" rx="1.5" fill="currentColor" />
      <rect x="25.5" y="4.5" width="1.5" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function AndroidSignalIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
      <path d="M0 11 L16 11 L16 1 Z" />
    </svg>
  );
}

function AndroidWifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
      <path d="M8 2 A9 9 0 0 1 15 5 L13 7 A6 6 0 0 0 8 5 A6 6 0 0 0 3 7 L1 5 A9 9 0 0 1 8 2 Z" />
      <path d="M8 7 A4 4 0 0 1 11 8.5 L8 11 L5 8.5 A4 4 0 0 1 8 7 Z" />
    </svg>
  );
}

function AndroidBatteryIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
      <rect x="3" y="0" width="6" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="0.5" y="1.5" width="11" height="14" rx="1.5" stroke="currentColor" />
      <rect x="2" y="3" width="8" height="11" rx="0.5" fill="currentColor" />
    </svg>
  );
}
