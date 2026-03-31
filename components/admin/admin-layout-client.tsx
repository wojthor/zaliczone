"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconBell, IconDashboard, IconPayroll, IconUser, IconUsers, IconWallet } from "@/components/icons";
import { logoFont } from "@/lib/logo-font";

const ADMIN_NAV = [
  { href: "/admin", label: "Główna", Icon: IconDashboard, indent: false },
  { href: "/admin/rozliczenia", label: "Rozliczenia", Icon: IconWallet, indent: false },
  { href: "/admin/wyplaty", label: "Wypłaty", Icon: IconPayroll, indent: false },
  { href: "/admin/ksiegowosc", label: "Księgowość", Icon: IconWallet, indent: false },
  { href: "/admin/nauczyciele", label: "Nauczyciele", Icon: IconUsers, indent: false },
  { href: "/admin/cennik", label: "Cennik i przedmioty", Icon: IconWallet, indent: false },
  { href: "/admin/powiadomienia", label: "Powiadomienia", Icon: IconBell, indent: false },
  { href: "/admin/dokumenty", label: "Dokumenty", Icon: IconUser, indent: false },
] as const;

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="text-depths flex min-h-[calc(100dvh-0.75rem)] gap-2">
      <aside className="hidden w-72 shrink-0 rounded-app bg-[#000C4A] p-3 text-luster lg:block">
        <div className="mb-3 border-b border-white/10 pb-3 text-center">
          <p className={`${logoFont.className} text-lime text-2xl font-black italic tracking-tight`}>ZALICZONE</p>
          <p className="text-steel text-[10px] font-semibold uppercase tracking-[0.2em]">Panel Admina</p>
        </div>
        <nav className="space-y-1">
          {ADMIN_NAV.map(({ href, label, Icon, indent }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-app py-2 text-sm font-semibold transition-colors ${
                  indent ? "ml-3 pl-3 border-l border-white/15 text-[13px]" : "px-2.5"
                } ${active ? "bg-lime text-depths" : "text-luster hover:bg-white/10"}`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${indent ? "opacity-90" : ""}`} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 rounded-app border-2 border-panel-frame bg-snow/90 p-4 sm:p-6">{children}</div>
    </div>
  );
}
