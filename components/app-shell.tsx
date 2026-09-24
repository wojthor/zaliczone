"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  IconCalendar,
  IconDashboard,
  IconGuide,
  IconLogout,
  IconMenu,
  IconUser,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { GlobalSearchButton, GlobalSearchModal } from "@/components/search/global-search";
import { signOut } from "@/lib/data/mutations";
import { logoFont } from "@/lib/logo-font";
import { dashboardSans } from "@/lib/dashboard-fonts";

const mainNav = [
  {
    href: "/panel",
    label: "Dashboard",
    Icon: IconDashboard,
    keywords: [
      "panel główny",
      "start",
      "strona główna",
      "pulpit",
      "podsumowanie",
      "dzisiejsze lekcje",
      "najbliższa lekcja",
      "statystyki",
    ],
  },
  {
    href: "/terminarz",
    label: "Terminarz",
    Icon: IconCalendar,
    keywords: [
      "kalendarz",
      "grafik",
      "harmonogram",
      "plan zajęć",
      "plan tygodnia",
      "lekcje",
      "zajęcia",
      "dodaj lekcję",
      "nowa lekcja",
      "edytuj lekcję",
      "cykliczne",
      "tydzień",
      "zaplanowane",
    ],
  },
  {
    href: "/uczniowie",
    label: "Uczniowie",
    Icon: IconUsers,
    keywords: [
      "uczeń",
      "dodaj ucznia",
      "edytuj ucznia",
      "kontakt",
      "telefon",
      "stawka ucznia",
      "przedmioty ucznia",
      "klasa",
      "poziom ucznia",
      "notatki",
      "zablokowany",
      "historia lekcji",
    ],
  },
  {
    href: "/finanse",
    label: "Finanse",
    Icon: IconWallet,
    keywords: [
      "zarobki",
      "pieniądze",
      "wypłata",
      "rozliczenia",
      "ewidencja",
      "ewidencja godzin",
      "pdf",
      "historia płatności",
      "ile zarobiłem",
      "premia",
      "bonus",
      "podatki",
      "pit",
      "stawka godzinowa",
      "miesiąc rozliczeniowy",
    ],
  },
] as const;

const guideNav = {
  href: "/przewodnik",
  label: "Przewodnik",
  Icon: IconGuide,
  keywords: [
    "pomoc",
    "faq",
    "instrukcja",
    "jak korzystać",
    "zasady",
    "regulamin",
    "wskazówki",
    "onboarding",
    "często zadawane pytania",
    "terminy",
  ],
} as const;

const profilNav = {
  href: "/profil",
  label: "Profil",
  Icon: IconUser,
  keywords: [
    "dane osobowe",
    "ustawienia",
    "konto bankowe",
    "numer konta",
    "hasło",
    "zmień hasło",
    "pesel",
    "dokumenty",
    "dane do umowy",
    "umowa",
    "kontrakt",
  ],
} as const;

const SEARCH_NAV_ITEMS = [...mainNav, guideNav, profilNav];

const SEARCH_HINTS = ["ewidencja", "wypłata", "uczeń", "lekcja", "hasło"];

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
    "flex h-11 w-11 items-center justify-center rounded-full transition touch-manipulation",
    active
      ? "landing-navy text-lime"
      : "text-depths/55 hover:bg-mist hover:text-depths",
  ].join(" ");
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const dashboardLocked = pathname === "/panel";
  const isLg = useLgUp();
  const showMobileDrawer = !isLg && mobileOpen;

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

  const closeMobile = () => {
    if (!isLg) setMobileOpen(false);
  };

  const sidebarInner = (
    <>
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/panel"
          onClick={closeMobile}
          title="Zaliczone"
          className={`${logoFont.className} landing-navy flex h-14 w-14 items-center justify-center rounded-full text-[1.85rem] font-extrabold italic uppercase leading-none tracking-tighter text-lime`}
        >
          Z
        </Link>

        <div className={RAIL}>
          <GlobalSearchButton onClick={() => setSearchOpen(true)} />
        </div>

        <nav className={RAIL} aria-label="Główne menu">
          {mainNav.map(({ href, label, Icon }) => {
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
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto flex flex-col items-center gap-3 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className={RAIL}>
          {(() => {
            const { href, label, Icon } = guideNav;
            const active = pathname === href;
            return (
              <Link
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={closeMobile}
                className={iconBtn(active)}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.1} />
              </Link>
            );
          })()}
        </div>

        <div className={RAIL}>
          <Link
            href="/profil"
            title="Profil"
            aria-label="Profil"
            onClick={closeMobile}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
              pathname === "/profil"
                ? "border-lime landing-navy text-lime"
                : "border-transparent bg-mist text-depths"
            }`}
          >
            <IconUser className="h-4 w-4" strokeWidth={2.25} />
          </Link>
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
      className={`tutor-shell tutor-shell-surface text-depths flex h-dvh max-h-dvh gap-3 overflow-hidden p-2 sm:gap-4 sm:p-3 ${dashboardSans.variable}`}
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
        navItems={SEARCH_NAV_ITEMS}
        personLabel="Uczniowie"
        placeholder="Szukaj ucznia, lekcji, strony…"
        hints={SEARCH_HINTS}
      />

      {/* Desktop: floating segmented icon rail */}
      <aside
        className="relative z-20 hidden h-full min-h-0 w-[4.75rem] shrink-0 flex-col gap-3 lg:flex"
        style={{ width: SIDEBAR_W }}
        aria-label="Nawigacja"
      >
        {sidebarInner}
      </aside>

      {/* Mobile drawer: same segmented rail */}
      <aside
        className="mobile-drawer-panel fixed top-2 bottom-2 left-2 z-50 flex w-[4.75rem] flex-col gap-3 lg:hidden"
        data-mobile-open={mobileOpen ? "true" : "false"}
        aria-label="Nawigacja"
      >
        {sidebarInner}
      </aside>

      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden ${
          dashboardLocked ? "max-lg:overflow-y-auto lg:overflow-hidden" : "overflow-y-auto"
        }`}
      >
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
            Zaliczone
          </p>
        </div>
        <div
          className={`flex min-w-0 flex-1 flex-col ${
            dashboardLocked
              ? "min-h-min lg:min-h-0 lg:overflow-hidden"
              : "min-h-0 overflow-x-hidden"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
