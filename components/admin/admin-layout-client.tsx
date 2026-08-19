"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  IconCalendar,
  IconChecklist,
  IconChevronLeft,
  IconClose,
  IconDashboard,
  IconDollar,
  IconFileDoc,
  IconGuide,
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
  { href: "/admin/kalendarz", label: "Kalendarz", Icon: IconCalendar },
  { href: "/admin/rozliczenia", label: "Lekcje", Icon: IconChecklist },
  { href: "/admin/wyplaty", label: "Wypłaty", Icon: IconWallet },
  { href: "/admin/ksiegowosc", label: "Księgowość", Icon: IconGuide },
  { href: "/admin/nauczyciele", label: "Nauczyciele", Icon: IconUsers },
  { href: "/admin/premie", label: "Premie", Icon: IconPayroll },
  { href: "/admin/cennik", label: "Cennik i przedmioty", Icon: IconDollar },
  { href: "/admin/dokumenty", label: "Dokumenty", Icon: IconFileDoc },
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
    <span className="sidebar-tooltip landing-navy rounded-app px-2.5 py-1.5 text-xs font-semibold text-luster shadow-lg">
      {label}
    </span>
  );
}

export function AdminLayoutClient({
  children,
  initialCollapsed = false,
  alertCount = 0,
}: {
  children: ReactNode;
  initialCollapsed?: boolean;
  alertCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLg = useLgUp();
  const effectiveCollapsed = isLg && collapsed;
  const isPrintDoc =
    pathname.startsWith("/admin/ksiegowosc/ewidencja") ||
    pathname.startsWith("/admin/ksiegowosc/koszty") ||
    pathname.startsWith("/admin/wyplaty/lista-plac");
  const isRozliczenia = pathname === "/admin/rozliczenia";

  useEffect(() => {
    if (!mobileOpen || isLg) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen, isLg]);

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
            className={`group relative flex items-center gap-2 rounded-app py-2 text-sm transition-colors ${
              collapsedLook ? "justify-center px-2" : "px-2.5"
            } ${active ? "nav-active" : "font-semibold text-luster hover:bg-white/10"}`}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            {!collapsedLook ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
            {href === "/admin" && alertCount > 0 ? (
              <span
                className={`flex items-center justify-center rounded-full bg-[#E23B3B] text-[10px] font-extrabold text-white ${
                  collapsedLook
                    ? "absolute right-0.5 top-0.5 h-4 min-w-4 px-0.5"
                    : "h-5 min-w-5 px-1"
                }`}
              >
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            ) : null}
            {collapsedLook ? <SidebarTooltip label={label} /> : null}
          </Link>
        );
      })}
    </nav>
  );

  const showMobileDrawer = !isLg && mobileOpen;

  return (
    <div className={`text-depths flex h-[calc(100dvh-0.75rem)] gap-2 ${dashboardSans.variable} ${dashboardMono.variable}`}>
      <button
        type="button"
        className="mobile-drawer-backdrop fixed inset-0 z-40 bg-depths/50 backdrop-blur-[2px] lg:hidden"
        data-open={mobileOpen ? "true" : "false"}
        aria-label="Zamknij menu"
        aria-hidden={!showMobileDrawer}
        tabIndex={showMobileDrawer ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className="mobile-drawer-panel landing-navy flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto rounded-app p-3 text-luster max-lg:top-1 max-lg:bottom-1 max-lg:left-1 max-lg:w-[min(17rem,calc(100vw-1rem))] max-lg:shadow-xl lg:static lg:shadow-none"
        data-mobile-open={mobileOpen ? "true" : "false"}
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
              <p className="text-steel text-[10px] font-semibold uppercase tracking-[0.2em]">Koordynator</p>
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-app bg-snow p-3 sm:p-6">
        <div className="mb-3 flex shrink-0 items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Otwórz menu"
            className="landing-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-app text-lime"
          >
            <IconMenu className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <p className={`${logoFont.className} text-depths min-w-0 truncate text-base font-extrabold italic uppercase tracking-tight`}>
            Zaliczone · Koordynator
          </p>
        </div>
        <div className={`min-h-0 flex-1 ${isRozliczenia ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"}`}>{children}</div>
      </div>
    </div>
  );
}
