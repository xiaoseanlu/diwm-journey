import { useId, useState, type ReactNode } from "react";
import "./tooltip.css";

type TooltipAlign = "left" | "center" | "right";
type TooltipPlacement = "top" | "bottom";

type TooltipProps = {
  children: ReactNode;
  content: ReactNode;
  align?: TooltipAlign;
  placement?: TooltipPlacement;
};

export function Tooltip({
  children,
  content,
  align = "center",
  placement = "bottom",
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="tt"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={`tt__bubble tt__bubble--${placement} tt__bubble--${align} ${
          open ? "tt__bubble--open" : ""
        }`}
      >
        {content}
      </span>
    </span>
  );
}
