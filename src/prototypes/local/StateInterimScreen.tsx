import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const STATE_INTERIM_COPY =
  "Customer answers legally required questions and go through State";

export function StateInterimScreen({ onContinue }: { onContinue: () => void }) {
  const [phoneRoot, setPhoneRoot] = useState<Element | null>(null);

  useEffect(() => {
    const phone = document.querySelector(".diwm-phone");
    setPhoneRoot(phone);
    phone?.classList.add("diwm-phone--state-interim");
    return () => phone?.classList.remove("diwm-phone--state-interim");
  }, []);

  const overlay = (
    <div className="post-call-state-interim" role="dialog" aria-labelledby="post-call-state-interim-title">
      <div className="post-call-state-interim__backdrop" aria-hidden />
      <div className="post-call-state-interim__content">
        <p id="post-call-state-interim-title" className="post-call-state-interim__text">
          {STATE_INTERIM_COPY}
        </p>
        <button type="button" className="post-call-state-interim__continue" onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );

  if (phoneRoot) return createPortal(overlay, phoneRoot);
  return overlay;
}
