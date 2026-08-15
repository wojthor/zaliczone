import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  /** Element w tej samej linii co tytuł zakładki (np. wyszukiwarka) */
  titleAside?: ReactNode;
  children?: ReactNode;
  fillViewport?: boolean;
  compact?: boolean;
  surface?: "snow" | "luster";
};

export function PageShell({
  title,
  titleAside,
  children,
  fillViewport = false,
  compact = false,
  surface = "snow",
}: PageShellProps) {
  const surfaceClass = surface === "luster" ? "bg-mist/80" : "bg-snow";
  const paddingClass = compact ? "p-4 sm:p-5 lg:p-5" : "p-5 sm:p-7 lg:p-8";
  const gapClass = compact ? "mt-4" : "mt-6";

  return (
    <div
      className={`soft-panel ${surfaceClass} ${paddingClass} ${
        fillViewport ? "flex h-full min-h-0 w-full flex-1 flex-col" : ""
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="dash-sans text-depths flex flex-col gap-2.5 text-2xl font-bold tracking-tight sm:text-[1.7rem]">
          <span>{title}</span>
          <span className="h-1.5 w-14 max-w-full shrink-0 rounded-full bg-lime" aria-hidden />
        </h1>
        {titleAside ? <div className="mb-0.5 shrink-0">{titleAside}</div> : null}
      </div>
      {children != null && children !== "" ? (
        typeof children === "string" ? (
          <p className="text-muted mt-4 text-sm font-medium leading-relaxed">{children}</p>
        ) : (
          <div className={`${gapClass} ${fillViewport ? "flex min-h-0 flex-1 flex-col" : ""}`}>
            {children}
          </div>
        )
      ) : null}
    </div>
  );
}
