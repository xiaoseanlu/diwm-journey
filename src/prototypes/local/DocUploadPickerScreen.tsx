import { DeviceFrameSheetPortal } from "./DeviceFrameSheetPortal";

/** Full-screen iOS Files picker after choosing Upload (prototype). */
export function DocUploadPickerScreen({ onDone }: { onDone: () => void }) {
  return (
    <DeviceFrameSheetPortal
      className="doc-upload-picker"
      onClick={onDone}
      role="button"
      aria-label="Confirm file selection and return"
    >
      <img
        className="doc-upload-picker__img"
        src="images/doc-upload-iphone.png"
        alt=""
      />
    </DeviceFrameSheetPortal>
  );
}
