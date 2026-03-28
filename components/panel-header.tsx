import Link from "next/link";
import type { ReactNode } from "react";

type PanelHeaderProps = {
  title: string;
  action?: ReactNode;
  /** Tighter header for dense dashboards */
  compact?: boolean;
  /** Tytuł jako link do pełnej podstrony (np. terminarz, kalendarz) */
  titleHref?: string;
  /** Jasny tekst i linia — nagłówek na ciemnym tle (#000C4A) */
  onDark?: boolean;
};

export function PanelHeader({ title, action, compact, titleHref, onDark }: PanelHeaderProps) {
  const titleClass = `font-semibold tracking-tight ${onDark ? "text-luster" : "text-depths"} ${compact ? "text-xs" : "text-[0.8125rem]"}`;

  const titleNode = titleHref ? (
    <h2 className="min-w-0 flex-1">
      <Link
        href={titleHref}
        className={`${titleClass} inline-flex min-w-0 max-w-full items-center gap-1`}
      >
        <span className="truncate">{title}</span>
        <span
          className={`shrink-0 font-bold ${onDark ? "text-lime" : "text-depths"} ${onDark ? "text-[0.65rem]" : "text-sm"}`}
          aria-hidden
        >
          ↗
        </span>
      </Link>
    </h2>
  ) : (
    <h2 className={titleClass}>{title}</h2>
  );

  return (
    <div
      className={`flex items-center justify-between gap-2 ${compact ? "mb-2 pb-1.5" : "mb-2.5 pb-2"}`}
    >
      {titleNode}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
