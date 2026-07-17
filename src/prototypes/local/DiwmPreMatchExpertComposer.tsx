import { useState } from "react";
import { DiwmAiComposer } from "./diwm-ai-composer";
import { ExpertUpgradeSheet } from "./ExpertUpgradeSheet";

/** Composer + Expert Assist upgrade sheet for screens before Ben is matched. */
export function DiwmPreMatchExpertComposer({
  className,
  onAddExpertAssist,
}: {
  className?: string;
  /** Called when user taps Add Expert Assist · $19 */
  onAddExpertAssist?: () => void;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      {!upgradeOpen && (
        <DiwmAiComposer
          variant="diwm"
          className={className}
          expertInteraction="upgrade"
          onExpertUpgradeClick={() => setUpgradeOpen(true)}
        />
      )}
      {upgradeOpen && (
        <ExpertUpgradeSheet
          onClose={() => setUpgradeOpen(false)}
          onAddExpertAssist={() => {
            setUpgradeOpen(false);
            onAddExpertAssist?.();
          }}
        />
      )}
    </>
  );
}
