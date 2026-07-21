"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  IconChevronLeft,
  IconClose,
  IconDashboard,
  IconLogout,
  IconMenu,
  IconPayroll,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { signOut } from "@/lib/data/mutations";
import { dashboardMono, dashboardSans } from "@/lib/dashboard-fonts";
import { logoFont } from "@/lib/logo-font";

export const SIDEBAR_COLLAPSED_COOKIE = "admin_sidebar_collapsed";

const SIDEBAR_OPEN_W = "18rem";
const SIDEBAR_COLLAPSED_W = "4.5rem";

const ADMIN_NAV = [
  { href: "/admin", label: "Główna", Icon: IconDashboard },
  { href: "/admin/rozliczenia", label: "Rozliczenia", Icon: IconWallet },
  { href: "/admin/wyplaty", label: "Wypłaty", Icon: IconPayroll },
  { href: "/admin/ksiegowosc", label: "Księgowość", Icon: IconWallet },
  { href: "/admin/nauczyciele", label: "Nauczyciele", Icon: IconUsers },
  { href: "/admin/cennik", label: "Cennik i przedmioty", Icon: IconWallet },
  { href: "/admin/dokumenty", label: "Dokumenty", Icon: IconWallet },
] as const;

function subscribeLg(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function useLgUp() {
  return useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span className="sidebar-tooltip rounded-app bg-[#000C4A] px-2.5 py-1.5 text-xs font-semibold text-luster shadow-lg">
      {label}
    </span>
  );
}

export function AdminLayoutClient({
  children,
  initialCollapsed = false,
}: {
  children: ReactNode;
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLg = useLgUp();
  const effectiveCollapsed = isLg && collapsed;
  const isPrintDoc = pathname.startsWith("/admin/ksiegowosc/ewidencja");
  const isRozliczenia = pathname === "/admin/rozliczenia";

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  if (isPrintDoc) {
    return <>{children}</>;
  }

  const navItems = (collapsedLook: boolean, closeOnClick: boolean) => (
    <nav className="space-y-0.5">
      {ADMIN_NAV.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={closeOnClick ? () => setMobileOpen(false) : undefined}
            className={`group relative flex items-center gap-2 rounded-app py-2 text-sm font-semibold transition-colors ${
              collapsedLook ? "justify-center px-2" : "px-2.5"
            } ${active ? "bg-lime text-depths" : "text-luster hover:bg-white/10"}`}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            {!collapsedLook ? <span>{label}</span> : null}
            {collapsedLook ? <SidebarTooltip label={label} /> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className={`text-depths flex h-[calc(100dvh-0.75rem)] gap-2 ${dashboardSans.variable} ${dashboardMono.variable}`}>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-depths/50 backdrop-blur-[2px] lg:hidden"
          aria-label="Zamknij menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto rounded-app bg-[#000C4A] p-3 text-luster transition-[transform,width] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] max-lg:fixed max-lg:top-1 max-lg:bottom-1 max-lg:left-1 max-lg:z-50 max-lg:w-[min(17rem,calc(100vw-1rem))] max-lg:shadow-xl lg:static lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "" : "max-lg:pointer-events-none max-lg:-translate-x-[calc(100%+0.5rem)]"
        }`}
        style={{ width: isLg ? (effectiveCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_OPEN_W) : undefined }}
      >
        <div
          className={`mb-3 flex items-center border-b border-white/10 pb-3 ${
            effectiveCollapsed ? "flex-col gap-2" : "justify-between gap-2"
          }`}
        >
          <div className={effectiveCollapsed ? "text-center" : ""}>
            <p className={`${logoFont.className} text-lime font-black italic tracking-tight ${effectiveCollapsed ? "text-xl" : "text-2xl"}`}>
              {effectiveCollapsed ? "Z" : "ZALICZONE"}
            </p>
            {!effectiveCollapsed ? (
              <p className="text-steel text-[10px] font-semibold uppercase tracking-[0.2em]">Panel Admina</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              if (mobileOpen) setMobileOpen(false);
              else toggleCollapsed();
            }}
            aria-label={mobileOpen ? "Zamknij menu" : effectiveCollapsed ? "Rozwiń menu" : "Zwiń menu"}
            className="group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-luster transition-colors hover:bg-white/10"
          >
            <IconClose className="h-4.5 w-4.5 lg:hidden" />
            <IconChevronLeft
              className={`hidden h-4 w-4 transition-transform duration-300 lg:block ${effectiveCollapsed ? "rotate-180" : ""}`}
            />
            {effectiveCollapsed ? <SidebarTooltip label="Rozwiń menu" /> : null}
          </button>
        </div>

        <div className="lg:hidden">{navItems(false, true)}</div>
        <div className="hidden lg:block">{navItems(effectiveCollapsed, false)}</div>

        <div className="mt-auto border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`group relative flex w-full items-center gap-2 rounded-app py-2 text-sm font-semibold text-luster transition-colors hover:bg-white/10 ${
              effectiveCollapsed ? "justify-center px-2" : "px-2.5"
            }`}
          >
            <IconLogout className="h-4.5 w-4.5 shrink-0" />
            {!effectiveCollapsed ? <span>Wyloguj</span> : null}
            {effectiveCollapsed ? <SidebarTooltip label="Wyloguj" /> : null}
          </button>
          {!effectiveCollapsed ? (
            <p className="text-steel mt-2 px-2.5 text-[10px] leading-snug">
              Panel korepetytora: wyloguj się i zaloguj jako{" "}
              <span className="text-luster font-semibold">teacher@zaliczone.pl</span>
            </p>
          ) : null}
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-app border-2 border-panel-frame bg-snow/90 p-3 sm:p-6">
        <div className="mb-3 flex shrink-0 items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Otwórz menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-[#000C4A] text-lime"
          >
            <IconMenu className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <p className={`${logoFont.className} text-depths min-w-0 truncate text-base font-extrabold italic uppercase tracking-tight`}>
            Zaliczone · Admin
          </p>
        </div>
        <div className={`min-h-0 flex-1 ${isRozliczenia ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"}`}>{children}</div>
      </div>
    </div>
  );
}
