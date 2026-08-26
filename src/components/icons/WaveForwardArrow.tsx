import { SVGProps } from "react";

/**
 * Right-pointing arrow whose shaft is a gentle wave — communicates motion,
 * warmth, and passing kindness forward. Solid triangular tip for clarity at
 * small sizes; the tip sits a touch lower than the wave's midline so it reads
 * as a single continuous gesture.
 */
export default function WaveForwardArrow({
  size = 32,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Wavy shaft — ends just before the arrowhead so the join reads clean */}
      <path d="M3 15 Q 7.5 9, 12 15 T 21 17" />
      {/* Solid arrowhead, slightly below the wave's midline */}
      <path
        d="M19 12.5 L 27 17 L 19 21.5 Z"
        fill="currentColor"
        stroke="currentColor"
      />
    </svg>
  );
}
