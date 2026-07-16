"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  IconBell,
  IconCalendar,
  IconDashboard,
  IconLogout,
  IconMenu,
  IconUser,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { signOut } from "@/lib/data/mutations";
import { logoFont } from "@/lib/logo-font";

const nav = [
  { href: "/", label: "Dashboard", Icon: IconDashboard },
  { href: "/terminarz", label: "Terminarz", Icon: IconCalendar },
  { href: "/uczniowie", label: "Uczniowie", Icon: IconUsers },
  { href: "/powiadomienia", label: "Powiadomienia", Icon: IconBell },
  { href: "/finanse", label: "Finanse", Icon: IconWallet },
  { href: "/profil", label: "Profil", Icon: IconUser },
] as const;

const SIDEBAR_OPEN_W = "16.75rem";
const SIDEBAR_COLLAPSED_W = "4.5rem";

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

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const dashboardLocked = pathname === "/";
  const isLg = useLgUp();
  const showMobileDrawer = !isLg && mobileOpen;
  const showNavText = isLg ? open : mobileOpen;
  const sidebarWidth = isLg ? (open ? SIDEBAR_OPEN_W : SIDEBAR_COLLAPSED_W) : SIDEBAR_OPEN_W;

  useEffect(() => {
    if (!showMobileDrawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showMobileDrawer]);

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="text-depths flex h-dvh max-h-dvh gap-1.5 overflow-hidden p-1 sm:p-1.5">
      {showMobileDrawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-depths/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Zamknij menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`flex h-full min-h-0 shrink-0 flex-col overflow-hidden rounded-app bg-[#000C4A] text-luster transition-[transform,width] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] max-lg:fixed max-lg:top-1 max-lg:bottom-1 max-lg:left-1 max-lg:z-50 max-lg:w-[min(16.75rem,calc(100vw-0.5rem))] max-lg:shadow-2xl max-lg:pt-[max(0.25rem,env(safe-area-inset-top))] lg:static lg:translate-x-0 lg:shadow-none ${
          !isLg && !showMobileDrawer ? "max-lg:pointer-events-none max-lg:-translate-x-[calc(100%+0.5rem)]" : ""
        }`}
        style={{ width: isLg ? sidebarWidth : undefined }}
      >
        <div
          className={`flex shrink-0 items-center px-2.5 py-3 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] ${showNavText ? "justify-between gap-2" : "flex-col gap-2"}`}
        >
          {showNavText ? (
            <div className="min-w-0 flex-1 px-2 py-2 text-center">
              <p
                className={`${logoFont.className} text-lime text-[1.35rem] font-extrabold italic uppercase leading-[1.05] tracking-tighter sm:text-[1.65rem]`}
              >
                ZALICZONE
              </p>
              <p className="text-steel mt-1 text-[10px] font-medium uppercase leading-none tracking-[0.2em]">
                PANEL KOREPETYTORA
              </p>
            </div>
          ) : (
            <span
              className={`${logoFont.className} text-lime text-[1.35rem] font-extrabold italic uppercase leading-none tracking-tighter`}
            >
              Z
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (isLg) setOpen((v) => !v);
              else setMobileOpen(false);
            }}
            className="text-luster flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-semibold transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] touch-manipulation"
            aria-label={isLg ? (open ? "Zwiń menu" : "Rozwiń menu") : "Zamknij menu"}
            aria-expanded={isLg ? open : showMobileDrawer}
          >
            <span className="text-lime text-lg font-bold">{isLg ? (open ? "‹" : "›") : "‹"}</span>
          </button>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={!showNavText ? label : undefined}
                onClick={() => {
                  if (!isLg) setMobileOpen(false);
                }}
                className={`text-luster flex items-center gap-2.5 py-1.5 text-sm font-medium transition-colors duration-200 touch-manipulation ${showNavText ? "justify-start px-0.5" : "justify-center"}`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    active ? "bg-lime text-depths" : "text-luster"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </span>
                {showNavText ? <span className="min-w-0 flex-1 truncate leading-snug">{label}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 px-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={() => {
              if (!isLg) setMobileOpen(false);
              void handleLogout();
            }}
            title={!showNavText ? "Wyloguj" : undefined}
            className={`text-luster flex w-full items-center gap-2.5 py-1.5 text-sm font-medium transition-colors hover:text-lime touch-manipulation ${showNavText ? "justify-start px-0.5" : "justify-center"}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-luster">
              <IconLogout className="h-5 w-5 shrink-0" />
            </span>
            {showNavText ? <span className="min-w-0 flex-1 truncate leading-snug">Wyloguj</span> : null}
          </button>
        </div>
      </aside>
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden py-0 pr-1 pl-0 max-lg:min-w-0 max-lg:pl-1 ${
          dashboardLocked
            ? "max-lg:overflow-y-auto lg:overflow-hidden"
            : "overflow-y-auto"
        }`}
      >
        <div className="sticky top-0 z-30 mb-1 flex shrink-0 items-center gap-2 bg-luster/95 py-2 pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="text-depths flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-panel-frame/50 bg-snow/90 touch-manipulation"
            aria-label="Otwórz menu"
            aria-expanded={showMobileDrawer}
            onClick={() => setMobileOpen(true)}
          >
            <IconMenu className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <p className={`${logoFont.className} text-depths min-w-0 truncate text-lg font-extrabold italic uppercase tracking-tight`}>
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
