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
      aria-label="Zobacz więcej"
      title="Zobacz więcej"
      className={`inline-flex items-center font-bold leading-none transition hover:opacity-75 ${
        inverted ? "text-lime" : "text-depths"
      } ${compact ? "text-sm" : "text-base"}`}
    >
      ↗
    </Link>
  );
}
