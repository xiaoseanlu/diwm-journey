import { useState } from "react";
import {
  ComposerMicIcon,
  ComposerPlusIcon,
  ComposerWaveformIcon,
} from "./diwm-composer-icons";
import "./diwm-ai-composer.css";

export type DiwmAiComposerVariant = "diy" | "diwm";

/** Share-docs chat stages that drive the expert pill label. */
export type DiwmComposerExpertLabel = "Expert help" | "Switch to call" | "Ask Ben";

export const DIWM_COMPOSER_EXPERT_LABELS = {
  expertHelp: "Expert help",
  switchToCall: "Switch to call",
  askBen: "Ask Ben",
} as const satisfies Record<string, DiwmComposerExpertLabel>;

export const DIWM_BEN_MATCHED_STAGE = 25;

export const DIWM_COMPOSER_EXPERT_AVATARS = {
  /** Generic expert — before a match is assigned */
  unmatched: "images/expert-avatar.png",
  /** Matched expert (Ben) — pre-composed dark-blue chip (composer default before state work) */
  ben: "images/ben-brightblue.png",
} as const;

/**
 * Expert pill avatar in share-docs:
 * - Before Ben is matched: generic expert portrait
 * - After match: Ben
 */
export function resolveShareDocsComposerExpertAvatar(stage: number): string {
  return stage < DIWM_BEN_MATCHED_STAGE
    ? DIWM_COMPOSER_EXPERT_AVATARS.unmatched
    : DIWM_COMPOSER_EXPERT_AVATARS.ben;
}

/**
 * Expert pill copy in the share-docs composer:
 * - Before "Keep going in chat" (stage 33): Expert help
 * - Keep-going thread while Ben is in chat: Switch to call
 * - After Ben leaves (wrap-up done / post-call): Ask Ben
 */
export function resolveShareDocsComposerExpertLabel(
  stage: number,
  benWrapUpDone: boolean,
): DiwmComposerExpertLabel {
  if (benWrapUpDone || stage >= 47) return DIWM_COMPOSER_EXPERT_LABELS.askBen;
  if (stage >= 33) return DIWM_COMPOSER_EXPERT_LABELS.switchToCall;
  return DIWM_COMPOSER_EXPERT_LABELS.expertHelp;
}

/** Pre-match → upgrade sheet; after Ben is matched → call / schedule menu. */
export function resolveShareDocsComposerExpertInteraction(
  stage: number,
): "upgrade" | "call-menu" {
  return stage < DIWM_BEN_MATCHED_STAGE ? "upgrade" : "call-menu";
}

export type DiwmAiComposerProps = {
  variant?: DiwmAiComposerVariant;
  placeholder?: string;
  className?: string;
  expertLabel?: string;
  expertAvatarSrc?: string;
  expertLive?: boolean;
  /** Pre-match opens upgrade sheet; post-match opens call / schedule menu. */
  expertInteraction?: "upgrade" | "call-menu";
  onExpertClick?: () => void;
  onExpertUpgradeClick?: () => void;
  onScheduleCall?: () => void;
};

function PlusPopoverMenu({ onClose }: { onClose: () => void }) {
  return (
    <div className="diwm-ai-composer__popover" role="menu">
      <button type="button" className="diwm-ai-composer__popover-item" onClick={onClose}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload
      </button>
      <button type="button" className="diwm-ai-composer__popover-item" onClick={onClose}>
        <img className="diwm-ai-composer__popover-icon-img" src="images/plug.png" alt="" width="22" height="22" />
        Connect
      </button>
      <button type="button" className="diwm-ai-composer__popover-item" onClick={onClose}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        Camera
      </button>
    </div>
  );
}

function ExpertMenu({
  onClose,
  onScheduleCall,
}: {
  onClose: () => void;
  onScheduleCall: () => void;
}) {
  return (
    <div className="diwm-ai-composer__expert-menu" role="menu">
      <button type="button" className="diwm-ai-composer__expert-menu-item" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
        Call
      </button>
      <button
        type="button"
        className="diwm-ai-composer__expert-menu-item"
        onClick={() => {
          onClose();
          onScheduleCall();
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Schedule a call
      </button>
    </div>
  );
}

const COMPOSER_ICON_MAP = {
  plus: ComposerPlusIcon,
  mic: ComposerMicIcon,
  waveform: ComposerWaveformIcon,
} as const;

function ComposerIconButton({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: keyof typeof COMPOSER_ICON_MAP;
  onClick?: () => void;
  active?: boolean;
}) {
  const Icon = COMPOSER_ICON_MAP[icon];
  return (
    <button
      type="button"
      className={`diwm-ai-composer__icon-btn${active ? " diwm-ai-composer__icon-btn--active" : ""}`}
      aria-label={label}
      onClick={onClick}
    >
      <span className="diwm-ai-composer__icon-art">
        <Icon />
      </span>
    </button>
  );
}

export function DiwmAiComposer({
  variant = "diwm",
  placeholder = "Ask anything",
  className = "",
  expertLabel = "Expert help",
  expertAvatarSrc = DIWM_COMPOSER_EXPERT_AVATARS.unmatched,
  expertLive = false,
  expertInteraction = "call-menu",
  onExpertClick,
  onExpertUpgradeClick,
  onScheduleCall,
}: DiwmAiComposerProps) {
  const [plusOpen, setPlusOpen] = useState(false);
  const [expertMenuOpen, setExpertMenuOpen] = useState(false);
  const isDiwm = variant === "diwm";
  const showExpertCallMenu = expertInteraction === "call-menu" && !!onScheduleCall;

  const closePlus = () => setPlusOpen(false);
  const togglePlus = () => {
    setPlusOpen((open) => !open);
    setExpertMenuOpen(false);
  };
  const toggleExpert = () => {
    setPlusOpen(false);
    if (expertInteraction === "upgrade") {
      onExpertUpgradeClick?.();
      onExpertClick?.();
      return;
    }
    setExpertMenuOpen((open) => !open);
    onExpertClick?.();
  };

  return (
    <div
      className={`diwm-ai-composer diwm-ai-composer--${variant} ${className}`.trim()}
      data-node-id={isDiwm ? "2903:120529" : "2623:70712"}
    >
      {plusOpen && <PlusPopoverMenu onClose={closePlus} />}
      {isDiwm && expertMenuOpen && showExpertCallMenu && (
        <ExpertMenu onClose={() => setExpertMenuOpen(false)} onScheduleCall={onScheduleCall!} />
      )}

      <div className="diwm-ai-composer__input-group" data-name="Input group">
        <div
          className="diwm-ai-composer__shell"
          data-name="CDS Intuit AI input"
          data-node-id={isDiwm ? "2903:120531" : "2623:61984"}
        >
          <div className="diwm-ai-composer__shell-bg" aria-hidden />
          <div className="diwm-ai-composer__shell-border" aria-hidden />

          {isDiwm ? (
            <>
              <div className="diwm-ai-composer__stack" data-node-id="2903:120534">
                <div className="diwm-ai-composer__text-row" data-node-id="2903:120537">
                  <span className="diwm-ai-composer__caret" aria-hidden />
                  <span className="diwm-ai-composer__placeholder">{placeholder}</span>
                </div>
              </div>

              <div className="diwm-ai-composer__stack diwm-ai-composer__stack--toolbar" data-node-id="2903:120540">
                <div className="diwm-ai-composer__toolbar-row" data-node-id="2903:120542">
                  <div className="diwm-ai-composer__tools-left" data-node-id="2903:120543">
                    <ComposerIconButton label="Add" icon="plus" onClick={togglePlus} active={plusOpen} />
                    <button
                      type="button"
                      className={`diwm-ai-composer__expert-pill${expertLive ? " diwm-ai-composer__expert-pill--live" : ""}`}
                      data-node-id="2903:120499"
                      aria-label={expertLabel}
                      aria-expanded={showExpertCallMenu ? expertMenuOpen : undefined}
                      onClick={toggleExpert}
                    >
                      <span className="diwm-ai-composer__expert-avatar-wrap" data-node-id="2903:120548">
                        <img src={expertAvatarSrc} alt="" className="diwm-ai-composer__expert-avatar" />
                      </span>
                      <span className="diwm-ai-composer__expert-label">{expertLabel}</span>
                    </button>
                  </div>
                  <div className="diwm-ai-composer__tools-right" data-node-id="2903:120550">
                    <ComposerIconButton label="Microphone" icon="mic" />
                    <ComposerIconButton label="Voice mode" icon="waveform" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="diwm-ai-composer__stack" data-node-id="2623:61987">
              <div className="diwm-ai-composer__toolbar-row diwm-ai-composer__toolbar-row--diy" data-node-id="2623:61989">
                <ComposerIconButton label="Add" icon="plus" onClick={togglePlus} active={plusOpen} />
                <div className="diwm-ai-composer__field" data-node-id="2623:61991">
                  <span className="diwm-ai-composer__placeholder">{placeholder}</span>
                </div>
                <ComposerIconButton label="Microphone" icon="mic" />
                <ComposerIconButton label="Voice mode" icon="waveform" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
