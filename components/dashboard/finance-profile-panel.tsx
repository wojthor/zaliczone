"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconLogout, IconUser, IconWallet } from "@/components/icons";
import { SeeMoreLink } from "@/components/see-more-link";
import { signOut } from "@/lib/data/mutations";

export type LessonSummaryStats = {
  total: number;
  pending: number;
  verified: number;
  unpaid: number;
  totalHours: number;
};

type FinanceProfilePanelProps = {
  tutorName: string;
  totalPayout: number;
  lessonStats: LessonSummaryStats;
};

/** Statusy wyłącznie z palety granat/limonka/szary */
const LESSON_STATUS_COLORS = {
  pending: "#D5ED21",
  verified: "#000C4A",
  unpaid: "#AAAAAA",
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

export function FinanceProfilePanel({
  tutorName,
  totalPayout,
  lessonStats,
}: FinanceProfilePanelProps) {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  const hoursLabel = Number(lessonStats.totalHours).toLocaleString("pl-PL", {
    maximumFractionDigits: 1,
  });
  const amountLabel = totalPayout.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
      <div className="card-feature flex min-h-0 flex-1 flex-col overflow-hidden px-2.5 py-2">
        <div className="section-label flex shrink-0 items-center gap-1.5 !text-lime">
          <IconWallet className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          Do wypłaty
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-center py-1">
          <p className="text-center leading-none">
            <span className="mark-highlight-on-dark text-[clamp(2rem,5vw,3.5rem)]">
              {amountLabel}
            </span>
            <span className="ml-1 text-base font-bold text-soft-lime sm:text-lg">zł</span>
          </p>
        </div>
        <div className="flex shrink-0 justify-center pt-0.5">
          <SeeMoreLink href="/finanse" compact inverted />
        </div>
      </div>

      <div className="shrink-0 rounded-app bg-snow px-2.5 py-2">
        <div className="text-center">
          <p className="text-depths text-2xl font-extrabold tabular-nums leading-none tracking-tight">
            {hoursLabel}
          </p>
          <p className="section-label mt-1">godz. łącznie</p>
        </div>
        <div className="mt-2 border-t-2 border-paper pt-2">
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

      <div className="card-feature-alt shrink-0 px-2.5 py-2">
        <Link href="/profil" className="flex min-w-0 items-center gap-2.5">
          <span className="avatar-initials h-9 w-9 shrink-0 text-sm">
            <IconUser className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="section-label !text-soft-lime/80">Profil</p>
            <p className="mt-0.5 truncate text-sm font-extrabold leading-tight text-soft-lime">
              {tutorName}
            </p>
          </div>
          <span className="shrink-0 text-xl font-light leading-none text-lime" aria-hidden>
            ›
          </span>
        </Link>
        <div className="mt-1.5 border-t border-white/10 pt-1.5">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center justify-between rounded-ledger bg-white/6 px-2.5 py-1.5 text-xs font-bold text-luster/90 transition hover:bg-white/10 hover:text-lime"
          >
            <span className="flex items-center gap-2">
              <IconLogout className="h-3.5 w-3.5" />
              Wyloguj
            </span>
            <span className="text-base leading-none text-luster/50 transition group-hover:text-lime" aria-hidden>
              ›
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
