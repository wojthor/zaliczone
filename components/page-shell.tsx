import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  children?: ReactNode;
  fillViewport?: boolean;
  compact?: boolean;
  surface?: "snow" | "luster";
};

export function PageShell({
  title,
  children,
  fillViewport = false,
  compact = false,
  surface = "snow",
}: PageShellProps) {
  const surfaceClass = surface === "luster" ? "bg-luster/90" : "bg-snow/90";
  const paddingClass = compact ? "p-3 sm:p-4 lg:p-4" : "p-4 sm:p-6 lg:p-8";
  const gapClass = compact ? "mt-3" : "mt-6";

  return (
    <div
      className={`rounded-app ${surfaceClass} ${paddingClass} ${
        fillViewport ? "flex h-full min-h-0 w-full flex-1 flex-col" : ""
      }`}
    >
      <h1 className="text-depths flex flex-col gap-1.5 text-2xl font-semibold tracking-tight">
        <span>{title}</span>
        <span className="h-1.5 w-20 max-w-full shrink-0 rounded-full bg-lime" aria-hidden />
      </h1>
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
