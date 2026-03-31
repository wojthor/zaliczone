import Link from "next/link";
import { IconUser, IconWallet } from "@/components/icons";
import { SeeMoreLink } from "@/components/see-more-link";
import { DEMO_FINANCE_LINES, DEMO_STUDENTS } from "@/lib/demo-data";

function minutesFromFinanceLabel(label: string): number {
  const match = label.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 60;
}

export function FinanceProfilePanel() {
  const totalPayout = DEMO_FINANCE_LINES.reduce((sum, line) => sum + line.amountPln, 0);
  const totalHours = Math.round((DEMO_FINANCE_LINES.reduce((sum, line) => sum + minutesFromFinanceLabel(line.label), 0) / 60) * 10) / 10;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-app bg-[#000C4A] px-2 py-2 text-luster">
        <div className="flex shrink-0 items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-lime">
          <IconWallet className="h-5 w-5 shrink-0" strokeWidth={2.5} />
          Wypłata
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-center py-1">
          <p className="text-center text-3xl font-black leading-[1.05] tracking-tight text-lime sm:text-4xl">
            {totalPayout.toLocaleString("pl-PL")} zł
          </p>
        </div>
        <div className="flex shrink-0 justify-center pt-0.5">
          <SeeMoreLink href="/finanse" compact inverted />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-app border-2 border-panel-frame bg-luster px-2 py-2">
        <div className="flex min-h-0 flex-1 flex-row items-center justify-center gap-6 rounded-lg bg-luster/90 px-2 py-1.5 sm:gap-10">
          <div className="text-center">
            <p className="text-muted text-[0.625rem] font-bold uppercase tracking-wide">Łącznie</p>
            <p className="text-depths mt-1 text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-3xl">{totalHours}</p>
            <p className="text-depths/75 mt-0.5 text-[0.65rem] font-bold">godz.</p>
          </div>
          <div className="text-center">
            <p className="text-muted text-[0.625rem] font-bold uppercase tracking-wide">Łącznie</p>
            <p className="text-depths mt-1 text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-3xl">{DEMO_STUDENTS.length}</p>
            <p className="text-depths/75 mt-0.5 text-[0.65rem] font-bold">uczniów</p>
          </div>
        </div>
        <div className="flex shrink-0 justify-center pt-1">
          <SeeMoreLink href="/uczniowie" compact />
        </div>
      </div>

      <Link
        href="/profil"
        className="flex min-h-0 flex-1 items-center gap-2.5 overflow-hidden rounded-app bg-[#000C4A] px-2.5 py-2 text-luster"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-steel/20 text-luster">
          <IconUser className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-luster/75">Profil</p>
          <p className="mt-0.5 truncate text-sm font-semibold leading-tight">Jan Kowalczyk</p>
        </div>
        <span className="shrink-0 text-2xl font-light leading-none text-lime" aria-hidden>
          ›
        </span>
      </Link>
    </div>
  );
}
