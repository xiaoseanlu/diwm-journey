import { useEffect } from "react";
import "./hub-back.css";

/**
 * Floating "Back to prototypes" pill — shown on every prototype route.
 * Clicking (or pressing Esc) returns to the home hub.
 * Deliberately styled like a prototype-mode chrome element (not part of CGDS)
 * so teammates don't confuse it with real TurboTax UI during a demo.
 */
export function HubBackButton() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Don't hijack Esc when a modal/dropdown/input is the target
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
          return;
        }
        window.location.hash = "";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <a
      className="hub-back"
      href="#"
      aria-label="Back to prototype hub (Esc)"
      title="Back to prototype hub (Esc)"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
        <path
          d="M9 3 L5 7 L9 11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Prototypes</span>
      <kbd className="hub-back__kbd">Esc</kbd>
    </a>
  );
}
