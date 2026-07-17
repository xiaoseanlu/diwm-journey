import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DeviceFrameSheetPortalProps = {
  className?: string;
  onClick?: () => void;
  role?: string;
  "aria-hidden"?: boolean;
  children: ReactNode;
};

/** Portal a full-phone sheet scrim to `.diwm-device-frame` (status bar floats above dimmed scrim). */
export function DeviceFrameSheetPortal({
  className = "",
  onClick,
  role,
  "aria-hidden": ariaHidden,
  children,
}: DeviceFrameSheetPortalProps) {
  const [deviceFrame, setDeviceFrame] = useState<Element | null>(null);

  useEffect(() => {
    setDeviceFrame(document.querySelector(".diwm-device-frame"));
  }, []);

  const scrim = (
    <div
      className={`diwm-sheet-scrim--device-frame${className ? ` ${className}` : ""}`}
      onClick={onClick}
      role={role}
      aria-hidden={ariaHidden}
    >
      {children}
    </div>
  );

  return deviceFrame ? createPortal(scrim, deviceFrame) : scrim;
}
