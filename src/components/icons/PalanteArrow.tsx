import { SVGProps } from "react";

/**
 * Bold, solid right-pointing arrow inspired by the forward wedge in the
 * Pásalo Pa'lante wordmark. Uses currentColor so it inherits text color.
 */
export default function PalanteArrow({
  size = 16,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {/* Chunky block arrow: shaft + triangular head, all one solid shape */}
      <path d="M2 9.25h10V4.5l10 7.5-10 7.5v-4.75H2z" />
    </svg>
  );
}
