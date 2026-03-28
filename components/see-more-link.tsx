import Link from "next/link";

type SeeMoreLinkProps = {
  href: string;
  compact?: boolean;
  /** Jasny tekst na ciemnym tle (np. wypłata, profil) */
  inverted?: boolean;
};

export function SeeMoreLink({ href, compact, inverted }: SeeMoreLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 font-semibold ${inverted ? "text-luster" : "text-depths"} ${compact ? "text-xs" : "text-sm"}`}
    >
      Zobacz więcej{" "}
      <span
        className={`text-sm font-bold ${inverted ? "text-lime" : "text-depths"}`}
        aria-hidden
      >
        ➔
      </span>
    </Link>
  );
}
