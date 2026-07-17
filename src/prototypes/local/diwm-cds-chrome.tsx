/**
 * DIWM chrome wrappers around cds-react-components.
 * Toolbars use showStatusBar={false} — status lives on DiwmPhoneShell.
 *
 */
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { Button, StickyActionFooter, Toolbar, type ToolbarType } from "cds-react-components/src/components";

const EXPERT_AVATAR = "images/expert-avatar.png";
const TT_TOOLBAR_LOGO = "images/figma-sku-choice/toolbar-tt-logo.svg";
const INTUIT_AI_LOGO = `${import.meta.env.BASE_URL}images/intuit-ai-logo-light.svg`;

const skuAiLogoStyle = {
  "--diwm-ai-logo-url": `url("${INTUIT_AI_LOGO}")`,
} as CSSProperties;

/** CDS AiSearchPill img uses `.src` on a shimmed SVG import — ensure logo loads. */
function patchSkuToolbarAiLogo(root: HTMLElement | null) {
  const img = root?.querySelector<HTMLImageElement>(
    ".diwm-cds-sku-toolbar__cds button[class*='flex-1'] img",
  );
  if (!img) return;
  if (!img.getAttribute("src")?.includes("intuit-ai-logo-light")) {
    img.src = INTUIT_AI_LOGO;
  }
}

/** SKU landing — CDS `tt-l0` with cart hidden; Sign in via CDS Button (see diwm-journey.css). */
export function DiwmSkuToolbar({
  onMenuOpen,
  onSignIn,
}: {
  onMenuOpen: () => void;
  onSignIn: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    patchSkuToolbarAiLogo(rowRef.current);
  });

  return (
    <header className="diwm-cds-sku-toolbar sku-choice__toolbar" data-node-id="2903:69517">
      <div ref={rowRef} className="diwm-cds-sku-toolbar__row" style={skuAiLogoStyle}>
        <Toolbar
          type="tt-l0"
          showStatusBar={false}
          progress={false}
          ttLogoSrc={TT_TOOLBAR_LOGO}
          aiPlaceholder="Ask anything"
          className="diwm-cds-toolbar-full diwm-cds-sku-toolbar__cds"
          onMenuClick={onMenuOpen}
        />
        <Button
          variant="primary"
          size="xsmall"
          label="Sign in"
          onClick={onSignIn}
          className="diwm-cds-sku-toolbar__sign-in !bg-[#236cff] !text-white"
        />
      </div>
    </header>
  );
}

export function DiwmBackToolbar({
  onBack,
  aiPlaceholder = "Ask anything",
}: {
  onBack: () => void;
  aiPlaceholder?: string;
}) {
  return (
    <Toolbar
      type="tt-l1"
      showStatusBar={false}
      progress={false}
      className="diwm-cds-toolbar-full"
      onBackClick={onBack}
      aiPlaceholder={aiPlaceholder}
    />
  );
}

export function DiwmHubToolbar({ onMenuOpen }: { onMenuOpen?: () => void }) {
  return (
    <Toolbar
      type="tt-l0"
      showStatusBar={false}
      progress={false}
      ttLogoSrc={TT_TOOLBAR_LOGO}
      className="diwm-cds-toolbar-full"
      onMenuClick={onMenuOpen}
      aiPlaceholder="Ask anything"
    />
  );
}

export type DiwmAssistedToolbarProps = {
  variant?: "l0" | "l1";
  title?: string;
  progress?: number;
  /** Use tt-vignettes chrome (menu+logo pill, cart). */
  showTitleRow?: boolean;
  /** Hide the center tax-return progress pill while keeping vignettes chrome. */
  hideVignetteLabel?: boolean;
  expertImageSrc?: string;
  onBack?: () => void;
  onMenuOpen?: () => void;
  onHubOpen?: () => void;
  onAiSearchClick?: () => void;
};

export function DiwmAssistedToolbar({
  variant = "l0",
  title: _title,
  progress: _progress = 0,
  showTitleRow = false,
  hideVignetteLabel = false,
  expertImageSrc = EXPERT_AVATAR,
  onBack,
  onMenuOpen,
  onHubOpen,
  onAiSearchClick,
}: DiwmAssistedToolbarProps) {
  if (showTitleRow) {
    return (
      <Toolbar
        type="tt-vignettes"
        showStatusBar={false}
        progress={false}
        progressValue={_progress}
        vignetteLabel={_title ?? "Chloe's 2026 taxes"}
        ttLogoSrc={TT_TOOLBAR_LOGO}
        className={`diwm-cds-toolbar-full${hideVignetteLabel ? " diwm-cds-toolbar-full--no-vignette" : ""}`}
        onMenuClick={variant === "l1" && onBack ? onBack : onMenuOpen}
        onCartClick={onHubOpen}
        onVignetteClick={onHubOpen}
      />
    );
  }

  const type: ToolbarType = variant === "l1" ? "tt-assisted-l1" : "tt-assisted";

  return (
    <Toolbar
      type={type}
      showStatusBar={false}
      progress={false}
      ttLogoSrc={TT_TOOLBAR_LOGO}
      expertImageSrc={expertImageSrc}
      aiPlaceholder="Ask anything"
      className="diwm-cds-toolbar-full"
      onBackClick={onBack}
      onMenuClick={onMenuOpen}
      onNotificationClick={onHubOpen}
      onAiSearchClick={onAiSearchClick ?? onHubOpen}
    />
  );
}

export type DiwmStickyCtaProps = {
  primaryLabel: string;
  onPrimaryClick?: () => void;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  disabled?: boolean;
  showFab?: boolean;
  fabImage?: string;
  onFabClick?: () => void;
  className?: string;
};

export function DiwmStickyCta({
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
  disabled,
  showFab = false,
  fabImage = EXPERT_AVATAR,
  onFabClick,
  className = "",
}: DiwmStickyCtaProps) {
  return (
    <div className={`diwm-cds-sticky-wrap ${className}`.trim()}>
      <StickyActionFooter
        primaryLabel={primaryLabel}
        onPrimaryClick={onPrimaryClick}
        secondaryLabel={secondaryLabel}
        onSecondaryClick={onSecondaryClick}
        showFab={showFab}
        fabImage={fabImage}
        onFabClick={onFabClick}
        className="diwm-cds-sticky-footer"
      />
      {disabled && <div className="diwm-cds-sticky-blocker" aria-hidden />}
    </div>
  );
}

export function DiwmPrimaryButton({
  label,
  onClick,
  disabled,
  className = "",
  size = "large",
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "large" | "small" | "xsmall";
}) {
  return (
    <Button
      variant="primary"
      size={size}
      label={label}
      onClick={onClick}
      disabled={disabled}
      className={className}
    />
  );
}

export function DiwmSecondaryButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Button variant="secondary" size="large" label={label} onClick={onClick} className={className} />
  );
}

/** SKU landing tile — Figma 2903:69552 / 2903:69562 two-line copy (summary + pricing). */
export function SkuLandingChoiceTile({
  label,
  summary,
  pricing,
  selected = false,
  onClick,
  className = "",
  "data-node-id": dataNodeId,
}: {
  label: string;
  summary: string;
  pricing: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  "data-node-id"?: string;
}) {
  const containerBg = selected
    ? "bg-[#c9ff98] border-[1.5px] border-green-9 shadow-[0px_0px_24px_0px_rgba(0,0,0,0.1)]"
    : "bg-surface-primary border border-border-base";
  const labelColor = selected ? "text-green-11" : "text-foreground-base";
  const descColor = selected ? "text-green-11 opacity-80" : "text-foreground-muted";

  return (
    <div
      className={`
        relative flex items-center
        min-h-[68px] px-6 py-5
        rounded-big w-full
        ${containerBg}
        ${onClick ? "cursor-pointer" : ""}
        ${className}
      `.trim()}
      data-node-id={dataNodeId}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex flex-1 flex-col gap-2 items-start min-w-0 w-full">
        <h3 className={`font-display text-xl font-medium leading-7 tracking-[-0.45px] ${labelColor}`}>
          {label}
        </h3>
        <p className={`text-sm font-medium leading-[22px] ${descColor}`}>{summary}</p>
        <p className={`text-sm font-normal leading-[22px] ${descColor}`}>{pricing}</p>
      </div>
    </div>
  );
}
