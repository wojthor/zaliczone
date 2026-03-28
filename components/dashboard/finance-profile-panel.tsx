import Link from "next/link";
import { IconUser, IconWallet } from "@/components/icons";
import { SeeMoreLink } from "@/components/see-more-link";

export function FinanceProfilePanel() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-app bg-[#000C4A] px-2 py-2 text-luster">
        <div className="text-lime flex shrink-0 items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-wide">
          <IconWallet className="text-lime h-5 w-5 shrink-0" strokeWidth={2.5} />
          Wypłata
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-stretch justify-center py-1">
          <p className="text-lime text-center text-3xl font-black leading-[1.05] tracking-tight sm:text-4xl">
            4 280 zł
          </p>
        </div>
        <div className="flex shrink-0 justify-center pt-0.5">
          <SeeMoreLink href="/finanse" compact inverted />
        </div>
      </div>
      <div className="bg-luster flex min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-app border-2 border-panel-frame px-2 py-2">
        <div className="flex min-h-0 flex-1 flex-row items-center justify-center gap-6 rounded-lg bg-luster/90 px-2 py-1.5 sm:gap-10">
          <div className="text-center">
            <p className="text-depths text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-3xl">42</p>
            <p className="text-depths/75 mt-0.5 text-[0.65rem] font-bold">godz.</p>
          </div>
          <div className="text-center">
            <p className="text-depths text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-3xl">12</p>
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
        <span className="bg-steel/20 text-luster flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <IconUser className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-luster/75 text-[0.625rem] font-semibold uppercase tracking-wide">Profil</p>
          <p className="mt-0.5 truncate text-sm font-semibold leading-tight">Jan Kowalczyk</p>
        </div>
        <span className="text-lime shrink-0 text-2xl font-light leading-none" aria-hidden>
          ›
        </span>
      </Link>
    </div>
  );
}
