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
  const surfaceClass = surface === "luster" ? "bg-mist" : "bg-snow";
  const paddingClass = compact ? "p-3 sm:p-4 lg:p-4" : "p-4 sm:p-6 lg:p-8";
  const gapClass = compact ? "mt-3" : "mt-6";

  return (
    <div
      className={`rounded-app ${surfaceClass} ${paddingClass} ${
        fillViewport ? "flex h-full min-h-0 w-full flex-1 flex-col" : ""
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-depths flex flex-col gap-1.5 text-2xl font-extrabold tracking-tight">
          <span>{title}</span>
          <span className="h-1.5 w-20 max-w-full shrink-0 rounded-ledger bg-lime" aria-hidden />
        </h1>
        {titleAside ? <div className="mb-0.5 shrink-0">{titleAside}</div> : null}
      </div>
      {children != null && children !== "" ? (
        typeof children === "string" ? (
          <p className="text-muted mt-4 text-sm font-medium">{children}</p>
        ) : (
          <div className={`${gapClass} ${fillViewport ? "flex min-h-0 flex-1 flex-col" : ""}`}>{children}</div>
        )
      ) : null}
    </div>
  );
}
