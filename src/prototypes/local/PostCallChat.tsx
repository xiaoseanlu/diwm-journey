import type { ReactNode } from "react";

export function ChatBubble({
  role,
  children,
  className = "",
}: {
  role: "assistant" | "user";
  children: ReactNode;
  className?: string;
}) {
  if (role === "user") {
    return (
      <div className={`post-call-chat post-call-chat--user ${className}`.trim()}>
        <div className="post-call-chat__user-pill">{children}</div>
      </div>
    );
  }
  return (
    <div className={`post-call-chat post-call-chat--assistant ${className}`.trim()}>
      <p className="post-call-chat__assistant-text">{children}</p>
    </div>
  );
}

export function ReplyChip({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="post-call-reply-chip chat-suggestion-chip"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
