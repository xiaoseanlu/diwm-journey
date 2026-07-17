import { DeviceFrameSheetPortal } from "./DeviceFrameSheetPortal";

/** Full-screen iOS lock screen with Ben / TurboTax SMS notification (prototype). */
export function AppointmentSmsLockScreen({
  onNotificationTap,
}: {
  onNotificationTap: () => void;
}) {
  return (
    <DeviceFrameSheetPortal className="appointment-sms-lock">
      <img
        className="appointment-sms-lock__img"
        src="images/appointment-sms-lock-screen.png"
        alt=""
      />
      <button
        type="button"
        className="appointment-sms-lock__notification"
        onClick={onNotificationTap}
        aria-label="Open message from Ben at TurboTax: Chloe, looking forward to meeting you in 5 minutes"
      />
    </DeviceFrameSheetPortal>
  );
}
