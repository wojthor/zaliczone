"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  IconCalendar,
  IconChecklist,
  IconDashboard,
  IconDollar,
  IconGuide,
  IconLogout,
  IconMenu,
  IconUserPlus,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { GlobalSearchButton, GlobalSearchModal } from "@/components/search/global-search";
import { signOut } from "@/lib/data/mutations";
import { dashboardMono, dashboardSans } from "@/lib/dashboard-fonts";
import { logoFont } from "@/lib/logo-font";

const ADMIN_NAV = [
  {
    href: "/admin",
    label: "Główna",
    Icon: IconDashboard,
    keywords: [
      "dashboard",
      "pulpit koordynatora",
      "statystyki",
      "podsumowanie",
      "start",
      "alerty",
      "powiadomienia",
      "przegląd miesiąca",
    ],
  },
  {
    href: "/admin/kalendarz",
    label: "Kalendarz",
    Icon: IconCalendar,
    keywords: [
      "terminy",
      "deadline",
      "harmonogram",
      "miesiąc",
      "zamknięcie miesiąca",
      "blokady",
      "ewidencja",
      "daty",
      "kalendarz płatności",
    ],
  },
  {
    href: "/admin/rozliczenia",
    label: "Lekcje",
    Icon: IconChecklist,
    keywords: [
      "weryfikacja",
      "zatwierdź",
      "zatwierdzanie",
      "do zatwierdzenia",
      "zatwierdzone",
      "nieopłacone",
      "rozliczenia",
      "płatności uczniów",
      "status lekcji",
      "odrzuć",
    ],
  },
  {
    href: "/admin/wyplaty",
    label: "Wypłaty",
    Icon: IconWallet,
    keywords: [
      "przelew",
      "wypłać",
      "lista płac",
      "wynagrodzenie",
      "nauczycielom",
      "pit",
      "podatki",
      "rozliczenie nauczyciela",
    ],
  },
  {
    href: "/admin/ksiegowosc",
    label: "Księgowość",
    Icon: IconGuide,
    keywords: [
      "koszty",
      "przychody",
      "sprzedaż",
      "pit-11",
      "ewidencja",
      "dokumenty księgowe",
      "raport",
      "podsumowanie finansowe firmy",
      "zamknięcie miesiąca",
    ],
  },
  {
    href: "/admin/nauczyciele",
    label: "Nauczyciele",
    Icon: IconUsers,
    keywords: [
      "nauczyciel",
      "korepetytor",
      "lista nauczycieli",
      "profil nauczyciela",
      "kontrakt",
      "telefon",
      "dysk google",
      "dokumenty",
      "przedmioty nauczyciela",
      "zatrudnienie",
    ],
  },
  {
    href: "/admin/rekrutacja",
    label: "Rekrutacja",
    Icon: IconUserPlus,
    keywords: [
      "kandydaci",
      "rekrutacja",
      "test",
      "zatrudnij",
      "odrzuć",
      "cv",
      "aplikacja",
      "google forms",
      "nowy nauczyciel",
    ],
  },
  {
    href: "/admin/cennik",
    label: "Cennik i przedmioty",
    Icon: IconDollar,
    keywords: [
      "stawki",
      "ceny",
      "cennik",
      "poziomy nauczania",
      "wniosek o przedmiot",
      "nowy przedmiot",
      "zatwierdź przedmiot",
      "cena za godzinę",
    ],
  },
] as const;

const ADMIN_SEARCH_HINTS = ["zatwierdź", "wypłaty", "cennik", "nauczyciel", "ewidencja"];

const SIDEBAR_W = "4.75rem";
const RAIL = "tutor-panel-surface flex flex-col items-center gap-1.5 rounded-[1.75rem] px-2 py-2.5";

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

function iconBtn(active: boolean) {
  return [
    "relative flex h-11 w-11 items-center justify-center rounded-full transition touch-manipulation",
    active
      ? "landing-navy text-lime"
      : "text-depths/55 hover:bg-mist hover:text-depths",
  ].join(" ");
}

export function AdminLayoutClient({
  children,
  alertCount = 0,
}: {
  children: ReactNode;
  alertCount?: number;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const isLg = useLgUp();
  const showMobileDrawer = !isLg && mobileOpen;
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

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  if (isPrintDoc) {
    return <>{children}</>;
  }

  const closeMobile = () => {
    if (!isLg) setMobileOpen(false);
  };

  const sidebarInner = (
    <>
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/admin"
          onClick={closeMobile}
          title="Zaliczone"
          className={`${logoFont.className} landing-navy flex h-14 w-14 items-center justify-center rounded-full text-[1.85rem] font-extrabold italic uppercase leading-none tracking-tighter text-lime`}
        >
          Z
        </Link>

        <div className={RAIL}>
          <GlobalSearchButton onClick={() => setSearchOpen(true)} />
        </div>

        <nav className={RAIL} aria-label="Nawigacja koordynatora">
          {ADMIN_NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={closeMobile}
                className={iconBtn(active)}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.1} />
                {href === "/admin" && alertCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E23B3B] px-0.5 text-[9px] font-extrabold text-white">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className={RAIL}>
          <button
            type="button"
            title="Wyloguj"
            aria-label="Wyloguj"
            onClick={() => {
              closeMobile();
              void handleLogout();
            }}
            className={iconBtn(false)}
          >
            <IconLogout className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.1} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`tutor-shell-surface text-depths flex h-dvh max-h-dvh gap-3 overflow-hidden p-2 sm:gap-4 sm:p-3 ${dashboardSans.variable} ${dashboardMono.variable}`}
    >
      <button
        type="button"
        className="mobile-drawer-backdrop fixed inset-0 z-40 bg-depths/35 backdrop-blur-[2px] lg:hidden"
        data-open={mobileOpen ? "true" : "false"}
        aria-label="Zamknij menu"
        aria-hidden={!showMobileDrawer}
        tabIndex={showMobileDrawer ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <GlobalSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        navItems={ADMIN_NAV}
        personLabel="Nauczyciele"
        placeholder="Szukaj nauczyciela, lekcji, strony…"
        hints={ADMIN_SEARCH_HINTS}
      />

      {/* Desktop: floating segmented icon rail - ten sam komponent co w panelu korepetytora */}
      <aside
        className="relative z-20 hidden h-full min-h-0 w-19 shrink-0 flex-col gap-3 lg:flex"
        style={{ width: SIDEBAR_W }}
        aria-label="Nawigacja"
      >
        {sidebarInner}
      </aside>

      {/* Mobile drawer: ten sam segmentowy rail */}
      <aside
        className="mobile-drawer-panel fixed top-2 bottom-2 left-2 z-50 flex w-19 flex-col gap-3 lg:hidden"
        data-mobile-open={mobileOpen ? "true" : "false"}
        aria-label="Nawigacja"
      >
        {sidebarInner}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-30 mb-2 flex shrink-0 items-center gap-3 pt-[max(0.15rem,env(safe-area-inset-top))] lg:hidden">
          <button
            type="button"
            className="tutor-panel-surface inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-depths touch-manipulation"
            aria-label="Otwórz menu"
            aria-expanded={showMobileDrawer}
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <p
            className={`${logoFont.className} text-depths min-w-0 truncate text-lg font-extrabold italic uppercase tracking-tight`}
          >
            Zaliczone · Koordynator
          </p>
        </div>
        <div className="tutor-panel-surface flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 sm:p-6">
          <div className={`min-h-0 flex-1 ${isRozliczenia ? "overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
