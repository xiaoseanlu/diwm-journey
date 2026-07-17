import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IntuitAssistBrand } from "./IntuitAssistBrand";

/** Matches running-checks.mov — each group clears before the next "Running N … checks" header */
export const RUNNING_CHECK_GROUPS = [
  {
    id: "income",
    label: "Running 23 income checks",
    items: [
      "W-2 Box 1 wages reconciled",
      "W-2 Box 2 federal withholding verified",
      "W-2 Box 12 codes checked",
      "W-2 Box 16 state wages matched",
      "1099-DIV qualified dividends rate checked",
      "1099-INT reverified",
      "Schedule D wash-sale rule applied",
      "Cash income threshold reviewed",
    ],
  },
  {
    id: "credit",
    label: "Running 36 credit checks",
    items: [
      "Earned income tax credit tested",
      "EITC investment income limit verified",
      "American opportunity credit checked",
      "Lifetime learning credit optimized",
      "Education credit phase-out range checked",
    ],
  },
  {
    id: "deduction",
    label: "Running 45 deduction checks",
    items: [
      "DMW fees included",
      "Taxes deducted",
      "Professional dues and membership included",
      "Charitable contributions included",
      "Medical expense 7.5% AGI verified",
      "Student loan interest deduction checked",
      "Standard vs itemized optimized",
    ],
  },
  {
    id: "compliance",
    label: "Running 60 compliance checks",
    items: [
      "Filing status determination confirmed",
      "AMT form 6251 liability tested",
      "Net investment income tax threshold tested",
      "Tax treaty benefit eligibility checked",
    ],
  },
] as const;

const CHECK_ITEM_MS = 650;
const GROUP_GAP_MS = 450;
const DONE_PAUSE_MS = 700;

function CheckmarkIcon() {
  return (
    <svg
      className="running-checks-fullscreen__check-icon"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.5 7.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RunningChecksAnimation({ onComplete }: { onComplete: () => void }) {
  const [phoneRoot, setPhoneRoot] = useState<Element | null>(null);
  const [groupIndex, setGroupIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  const group = RUNNING_CHECK_GROUPS[groupIndex];
  const isLastGroup = groupIndex >= RUNNING_CHECK_GROUPS.length - 1;

  useEffect(() => {
    const phone = document.querySelector(".diwm-phone");
    setPhoneRoot(phone);
    phone?.classList.add("diwm-phone--running-checks");
    return () => phone?.classList.remove("diwm-phone--running-checks");
  }, []);

  useEffect(() => {
    if (!group) return;

    if (visibleCount < group.items.length) {
      const delay = visibleCount === 0 ? 120 : CHECK_ITEM_MS;
      const id = window.setTimeout(() => setVisibleCount((c) => c + 1), delay);
      return () => window.clearTimeout(id);
    }

    if (!isLastGroup) {
      const id = window.setTimeout(() => {
        setGroupIndex((i) => i + 1);
        setVisibleCount(0);
      }, GROUP_GAP_MS);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(onComplete, DONE_PAUSE_MS);
    return () => window.clearTimeout(id);
  }, [group, groupIndex, visibleCount, isLastGroup, onComplete]);

  if (!group) return null;

  const overlay = (
    <div className="running-checks-fullscreen" aria-live="polite" aria-busy="true">
      <div className="running-checks-fullscreen__backdrop" aria-hidden />
      <div className="running-checks-fullscreen__content">
        <div className="running-checks-fullscreen__active">
          <IntuitAssistBrand className="running-checks-fullscreen__spinner" size={24} />
          <span className="running-checks-fullscreen__label">{group.label}</span>
        </div>
        <ul className="running-checks-fullscreen__list">
          {group.items.slice(0, visibleCount).map((label) => (
            <li key={`${group.id}-${label}`} className="running-checks-fullscreen__item running-checks-fullscreen__item--enter">
              <CheckmarkIcon />
              <span className="running-checks-fullscreen__item-label">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  if (phoneRoot) return createPortal(overlay, phoneRoot);
  return overlay;
}
