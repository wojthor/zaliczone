import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  children?: ReactNode;
};

export function PageShell({ title, children }: PageShellProps) {
  return (
    <div className="rounded-app border-2 border-panel-frame bg-snow/90 p-4 sm:p-6 lg:p-8">
      <h1 className="text-depths mb-2 flex flex-col gap-1.5 text-2xl font-semibold tracking-tight">
        <span>{title}</span>
        <span
          className="h-1.5 w-20 max-w-full shrink-0 rounded-full bg-lime"
          aria-hidden
        />
      </h1>
      {children != null && children !== "" ? (
        typeof children === "string" ? (
          <p className="text-muted mt-4 text-sm font-medium">{children}</p>
        ) : (
          <div className="mt-6">{children}</div>
        )
      ) : null}
    </div>
  );
}
