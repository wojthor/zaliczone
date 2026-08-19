"use client";

import { IconWallet } from "@/components/icons";
import { SeeMoreLink } from "@/components/see-more-link";

export type LessonSummaryStats = {
  total: number;
  pending: number;
  verified: number;
  unpaid: number;
  totalHours: number;
};

type FinanceProfilePanelProps = {
  totalPayout: number;
  lessonStats: LessonSummaryStats;
};

/** Statusy: oczekuje / zatwierdzona / nieopłacona */
const LESSON_STATUS_COLORS = {
  pending: "#000C4A",
  verified: "#D5ED21",
  unpaid: "#E23B3B",
} as const;

function StatCell({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color?: string;
}) {
  return (
    <div className="min-w-0 text-center">
      <p
        className={`text-sm font-extrabold tabular-nums leading-none tracking-tight ${color ? "" : "text-depths"}`}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      <p
        className={`mt-0.5 text-[0.5rem] font-extrabold uppercase leading-tight tracking-[0.04em] ${color ? "" : "text-muted"}`}
        style={color ? { color } : undefined}
      >
        {label}
      </p>
    </div>
  );
}

export function FinanceProfilePanel({ totalPayout, lessonStats }: FinanceProfilePanelProps) {
  const hoursLabel = Number(lessonStats.totalHours).toLocaleString("pl-PL", {
    maximumFractionDigits: 1,
  });
  const amountLabel = totalPayout.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="grid h-full min-h-0 min-w-0 grid-rows-2 gap-2 overflow-hidden">
      <div className="card-feature relative flex min-h-0 flex-col items-center justify-center gap-2 overflow-hidden px-3 py-3 text-center">
        <div className="absolute top-2.5 right-3">
          <SeeMoreLink href="/finanse" compact inverted />
        </div>
        <p className="section-label flex shrink-0 items-center justify-center gap-1.5 !text-lime">
          <IconWallet className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          Do wypłaty
        </p>
        <p className="shrink-0 leading-none">
          <span className="text-[clamp(1.6rem,3.2vw,2.1rem)] font-extrabold tabular-nums tracking-tight text-snow">
            {amountLabel}
          </span>
          <span className="ml-1 align-baseline text-sm font-bold text-soft-lime">zł</span>
        </p>
      </div>

      <div className="tutor-panel-surface flex min-h-0 flex-col overflow-hidden px-3 py-2.5 text-depths">
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 overflow-hidden">
          <div className="shrink-0 text-center">
            <p className="text-depths text-[clamp(1.25rem,2.5vw,1.75rem)] font-extrabold tabular-nums leading-none tracking-tight">
              {hoursLabel}
            </p>
            <p className="section-label mt-1">godz. łącznie</p>
          </div>
          <div className="shrink-0 border-t border-panel-frame/50 pt-2">
            <div className="grid grid-cols-4 gap-1">
              <StatCell value={lessonStats.total} label="lekcji" />
              <StatCell
                value={lessonStats.pending}
                label="do zatw."
                color={LESSON_STATUS_COLORS.pending}
              />
              <StatCell
                value={lessonStats.verified}
                label="zatwierdz."
                color={LESSON_STATUS_COLORS.verified}
              />
              <StatCell
                value={lessonStats.unpaid}
                label="brak wpłaty"
                color={LESSON_STATUS_COLORS.unpaid}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
