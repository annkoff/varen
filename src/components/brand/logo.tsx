import clsx from "clsx";

/**
 * VAREN wordmark: drawn with hairline strokes. The A is a bare gable (Λ) —
 * a roof line, the only "architectural" hint in the mark.
 */
export function Logo({ className, title = "VAREN" }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="-1 -1 114 26"
      className={clsx("h-[18px] w-auto", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <path d="M0 0 L9 24 L18 0" />
      <path d="M24 24 L33 0 L42 24" />
      <path d="M50 24 V0 H57.5 A6.5 6.5 0 0 1 57.5 13 H50 M56.5 13 L64.5 24" />
      <path d="M86 0 H72 V24 H86 M72 12 H83" />
      <path d="M94 24 V0 L111 24 V0" />
    </svg>
  );
}
