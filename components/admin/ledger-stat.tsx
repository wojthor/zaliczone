import type { ReactNode } from "react";

type Tick = "neutral" | "lime" | "butter" | "claret";
type Ink = "depths" | "moss" | "toffee" | "claret";
type Size = "lg" | "md";

/**
 * Pas KPI — sygnaturowy element nowego kierunku wizualnego /admin/*.
 * Odwrócony (navy tło, ostre rogi) zamiast miękkiej, jasnej karty — ma być widoczny
 * „na pierwszy rzut oka”, nie tylko po przybliżeniu. Ten sam element na Głównej,
 * Wypłatach, Księgowości, Rozliczeniach.
 */
export function LedgerBand({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const colsClass = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";
  return (
    <div
      className={`grid grid-cols-2 divide-x divide-y divide-white/10 overflow-hidden rounded-ledger bg-[#000C4A] ${colsClass} sm:divide-y-0`}
    >
      {children}
    </div>
  );
}

/** Pojedyncza kolumna paska KPI — mikro-etykieta + gigantyczna liczba mono. */
export function LedgerStat({
  label,
  tick = "neutral",
  ink = "depths",
  size = "md",
  children,
}: {
  label: string;
  tick?: Tick;
  ink?: Ink;
  size?: Size;
  children: ReactNode;
}) {
  void tick;
  void ink;
  const sizeClass = size === "lg" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-2xl sm:text-3xl";

  return (
    <div className="p-4 sm:p-5">
      <p className="dash-sans text-steel text-[10px] font-bold uppercase tracking-[0.16em]">{label}</p>
      <p className={`dash-mono mt-3 font-bold leading-none tracking-tight text-luster ${sizeClass}`}>
        {children}
      </p>
    </div>
  );
}
