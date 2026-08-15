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
      className={`inline-flex items-center gap-1 rounded-full font-semibold transition ${
        inverted
          ? "bg-lime px-2.5 py-1 text-depths hover:brightness-105"
          : "bg-[#000C4A] px-2.5 py-1 text-lime hover:brightness-110"
      } ${compact ? "text-[0.65rem]" : "text-xs"}`}
    >
      Zobacz więcej
      <span aria-hidden>➔</span>
    </Link>
  );
}
