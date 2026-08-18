import type { ReactNode } from "react";

export type FinanceTone = "navy" | "orange" | "green" | "red";

/**
 * Tone names kept for call-site compatibility; mapped to Zaliczone palette only
 * (navy / lime / soft-lime / steel - no red/orange/green hues).
 */
const FINANCE_TONE_STYLES: Record<
  FinanceTone,
  { background: string; label: string; value: string }
> = {
  navy: {
    background: "#000C4A",
    label: "#DFFD6F",
    value: "#D5ED21",
  },
  orange: {
    background: "#D5ED21",
    label: "#000C4A",
    value: "#000C4A",
  },
  green: {
    background: "#000C4A",
    label: "#DFFD6F",
    value: "#FFFFFF",
  },
  red: {
    background: "#AAAAAA",
    label: "#FFFFFF",
    value: "#FFFFFF",
  },
};

/** Kolorowy kafelek KPI - ten sam styl co na Głównej (Przychód / Koszty / Marża). */
export function FinanceTile({
  label,
  tone,
  children,
}: {
  label: string;
  tone: FinanceTone;
  children: ReactNode;
}) {
  const c = FINANCE_TONE_STYLES[tone];
  return (
    <article className="rounded-app p-4 sm:p-5" style={{ background: c.background }}>
      <p
        className="dash-sans text-[10px] font-extrabold uppercase tracking-[0.05em]"
        style={{ color: c.label }}
      >
        {label}
      </p>
      <p
        className="dash-mono mt-3 text-2xl font-extrabold leading-none tracking-tight tabular-nums sm:text-3xl"
        style={{ color: c.value, letterSpacing: "-0.02em" }}
      >
        {children}
      </p>
    </article>
  );
}

export function FinanceTilesRow({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 3 | 4;
}) {
  const cols = columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return <div className={`grid grid-cols-2 gap-3 ${cols}`}>{children}</div>;
}
