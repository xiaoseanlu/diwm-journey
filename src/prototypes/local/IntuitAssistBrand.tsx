import AnimatedBrand from "@genux-ds/animated-brand";
import type { AnimationType } from "@genux-ds/animated-brand";

export type IntuitAssistBrandProps = {
  /** Brand size in px (matches priya-loading default of 72 at large). */
  size?: number;
  playing?: boolean;
  loop?: true | number;
  className?: string;
  animationType?: AnimationType;
};

/** Lottie Intuit Intelligence brand — same as priya-loading in diwm-fy27-vision-web. */
export function IntuitAssistBrand({
  size = 24,
  playing = true,
  loop = true,
  className,
  animationType = "intuitIntelligenceDefault",
}: IntuitAssistBrandProps) {
  return (
    <span
      className={className ? `intuit-assist-brand ${className}` : "intuit-assist-brand"}
      aria-hidden
    >
      <AnimatedBrand
        animationType={animationType}
        playing={playing}
        loop={loop}
        size={size}
      />
    </span>
  );
}
