import { useEffect, useState } from "react";
import { IntuitAssistBrand } from "./IntuitAssistBrand";

const TRANSCRIBE_STEPS = [
  "Capturing call highlights",
  "Summarizing what you discussed",
  "Preparing your action items",
] as const;

const STEP_MS = 1100;
const DONE_PAUSE_MS = 500;

export function TranscribingAnimation({ onComplete }: { onComplete: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < TRANSCRIBE_STEPS.length) {
      const delay = visibleCount === 0 ? 400 : STEP_MS;
      const id = window.setTimeout(() => setVisibleCount((c) => c + 1), delay);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(onComplete, DONE_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [visibleCount, onComplete]);

  const shown = TRANSCRIBE_STEPS.slice(0, visibleCount);

  return (
    <div className="transcribing-animation etrade-flow--fade-in" aria-live="polite">
      <div className="transcribing-animation__header">
        <IntuitAssistBrand className="transcribing-animation__sparkle" size={24} />
        <span className="transcribing-animation__title">Transcribing your conversation</span>
      </div>
      {shown.length > 0 && (
        <ul className="transcribing-animation__steps">
          {shown.map((step) => (
            <li key={step} className="transcribing-animation__step">
              <span className="transcribing-animation__bullet" aria-hidden />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
