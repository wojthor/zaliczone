"use client";

import { toneForLimitPercent, type LimitBarTone } from "@/lib/podatki";

const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

const TONE_FILL: Record<LimitBarTone, string> = {
  ok: "#D5ED21", // lime
  warn: "#DFFD6F", // soft-lime / butter — ostrzeżenie w palecie
  danger: "#000C4A", // depths / claret alias
};

const TONE_TRACK = "#E8E8E6"; // mist / panel-frame

function formatPln(n: number): string {
  return PLN.format(n);
}

type LimitBarProps = {
  aktualnaWartosc: number;
  limit: number;
  label: string;
  /** Tekst pod paskiem (status limitu) */
  statusText?: string;
  /** Banner alertu pod paskiem */
  alertText?: string | null;
  /** Dodatkowa linia (np. licznik dni CEIDG) */
  alertDetail?: string | null;
};

/** Wspólny pasek limitu — styl zbliżony do FinanceTile (rounded-xl, shadow-sm, paleta Ops-Ledger). */
export function LimitProgressBar({
  aktualnaWartosc,
  limit,
  label,
  statusText,
  alertText,
  alertDetail,
}: LimitBarProps) {
  const procentRaw = limit > 0 ? (aktualnaWartosc / limit) * 100 : 0;
  const procent = Math.round(procentRaw * 10) / 10;
  const fillPct = Math.min(100, Math.max(0, procentRaw));
  const tone = toneForLimitPercent(procent);
  const fill = TONE_FILL[tone];
  const valueOnDark = tone === "danger";

  return (
    <article className="rounded-xl bg-snow p-4 shadow-sm ring-1 ring-panel-frame/40 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="dash-sans text-depths text-[10px] font-extrabold uppercase tracking-[0.05em]">
          {label}
        </p>
        <p className="dash-mono text-depths text-sm font-bold tabular-nums">
          {formatPln(aktualnaWartosc)}
          <span className="text-muted font-semibold"> / {formatPln(limit)}</span>
        </p>
      </div>

      <div
        className="mt-3 h-3 overflow-hidden rounded-full"
        style={{ background: TONE_TRACK }}
        role="progressbar"
        aria-valuenow={Math.round(fillPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${fillPct}%`, background: fill }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className={`dash-mono text-xs font-bold tabular-nums ${valueOnDark ? "text-depths" : "text-depths"}`}>
          {procent.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%
        </p>
        {statusText ? <p className="text-muted text-xs font-medium">{statusText}</p> : null}
      </div>

      {alertText ? (
        <div className="mt-3 rounded-app bg-[#000C4A] px-3 py-2.5 text-lime">
          <p className="text-xs font-bold leading-snug">{alertText}</p>
          {alertDetail ? <p className="mt-1 text-[0.7rem] font-medium text-soft-lime">{alertDetail}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

export function QuarterlyLimitBar(props: LimitBarProps) {
  return <LimitProgressBar {...props} />;
}

export function VatLimitBar(props: LimitBarProps) {
  return <LimitProgressBar {...props} />;
}
