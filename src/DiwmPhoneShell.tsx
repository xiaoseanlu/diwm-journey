import { type ReactNode } from "react";
import { DeviceStatusBar } from "cds-react-components/src/components";
import "./diwm-phone-shell.css";

type DiwmPhoneShellProps = {
  children: ReactNode;
};

/** Centers DIWM flows in a fixed iPhone frame with Dynamic Island status bar. */
export function DiwmPhoneShell({ children }: DiwmPhoneShellProps) {
  return (
    <div className="diwm-device-shell">
      <div className="diwm-device-frame">
        <DeviceStatusBar dynamicIsland={false} className="diwm-device-statusbar" />
        <div className="diwm-device-content">{children}</div>
        <div className="diwm-device-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
}
