import type { SVGProps } from "react";

/**
 * Logo Zaliczone — litera Z w kole (granat #000C4A / limonka #D5ED21).
 * Path + lekki skew: Z optycznie w środku, niezależnie od fontu.
 */
export function BrandLogoMark({
  className = "h-14 w-14",
  title = "Zaliczone",
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
      {...props}
    >
      <title>{title}</title>
      <circle cx="28" cy="28" r="28" fill="#000C4A" />
      {/* translate w lewo kompensuje skew italic — środek optyczny = środek koła */}
      <g transform="translate(27.15 28) skewX(-12)">
        <path
          fill="#D5ED21"
          d="M-13.2-14.4H13.2v5.9H1.1L13.2 8.5v5.9H-13.2v-5.9H-1.1L-13.2-8.5z"
        />
      </g>
    </svg>
  );
}
