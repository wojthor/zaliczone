"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
  type SVGProps,
} from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@/components/icons";
import { searchWorkspace, type SearchHit } from "@/lib/actions/search";

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Powiązane słowa/funkcje tej zakładki - dopasowanie po sensie, nie tylko po nazwie. */
  keywords?: readonly string[];
};

/**
 * Sam przycisk lupy - bez stanu, bo sidebar renderuje ten sam markup dwukrotnie
 * (wersja desktopowa + drawer mobilny), więc trzymanie stanu okna tutaj
 * zduplikowałoby modal. Stan i logika żyją w `GlobalSearchModal`, montowanym raz.
 */
export function GlobalSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Szukaj (Ctrl+K)"
      aria-label="Szukaj"
      className="flex h-11 w-11 items-center justify-center rounded-full text-depths/55 transition touch-manipulation hover:bg-mist hover:text-depths"
    >
      <IconSearch className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.1} />
    </button>
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type FlatRow =
  | { kind: "nav"; key: string; href: string; label: string; Icon: NavItem["Icon"] }
  | { kind: "hit"; key: string; href: string; title: string; subtitle: string };

/**
 * Okno wyszukiwania - montowane raz na shell (poza sidebarInner). Otwiera się
 * przez przycisk (GlobalSearchButton) albo Ctrl/Cmd+K. Trzy źródła wyników:
 * nawigacja (statyczna, natychmiastowa) oraz uczniowie/nauczyciele i lekcje
 * (dociągane serwerowo z debounce, w zależności od roli zalogowanej osoby).
 */
export function GlobalSearchModal({
  open,
  onOpenChange,
  navItems,
  personLabel,
  placeholder,
  hints = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: readonly NavItem[];
  /** "Uczniowie" (tutor) albo "Nauczyciele" (admin) - etykieta sekcji osób. */
  personLabel: string;
  placeholder: string;
  /** Podpowiedzi słów-kluczy pokazywane, zanim ktoś zacznie pisać. */
  hints?: readonly string[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [remote, setRemote] = useState<{ people: SearchHit[]; lessons: SearchHit[] }>({
    people: [],
    lessons: [],
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setRemote({ people: [], lessons: [] });
    setActiveIndex(0);
  }, [onOpenChange]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCombo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCombo) {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (e.key === "Escape" && open) close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close, onOpenChange]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setRemote({ people: [], lessons: [] });
      setPending(false);
      return;
    }
    const myId = ++requestId.current;
    setPending(true);
    const timer = window.setTimeout(() => {
      searchWorkspace(trimmed)
        .then((res) => {
          if (requestId.current !== myId) return;
          setRemote({ people: [...res.students, ...res.teachers], lessons: res.lessons });
        })
        .catch(() => {
          if (requestId.current !== myId) return;
          setRemote({ people: [], lessons: [] });
        })
        .finally(() => {
          if (requestId.current !== myId) return;
          setPending(false);
        });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filteredNav = useMemo(() => {
    const needle = normalize(query.trim());
    // Puste pole = brak listy - zakładki są już widoczne jako ikony w sidebarze,
    // więc nie duplikujemy ich tutaj. Wyszukiwanie ma sens dopiero po wpisaniu czegoś.
    if (needle.length < 2) return [];
    const labelMatches = navItems.filter((n) => normalize(n.label).includes(needle));
    const keywordMatches = navItems.filter(
      (n) =>
        !normalize(n.label).includes(needle) &&
        (n.keywords ?? []).some((k) => normalize(k).includes(needle)),
    );
    return [...labelMatches, ...keywordMatches];
  }, [navItems, query]);

  const rows = useMemo<FlatRow[]>(() => {
    const navRows: FlatRow[] = filteredNav.map((n) => ({
      kind: "nav",
      key: `nav-${n.href}`,
      href: n.href,
      label: n.label,
      Icon: n.Icon,
    }));
    const peopleRows: FlatRow[] = remote.people.map((p) => ({
      kind: "hit",
      key: `person-${p.id}`,
      href: p.href,
      title: p.title,
      subtitle: p.subtitle,
    }));
    const lessonRows: FlatRow[] = remote.lessons.map((l) => ({
      kind: "hit",
      key: `lesson-${l.id}`,
      href: l.href,
      title: l.title,
      subtitle: l.subtitle,
    }));
    return [...navRows, ...peopleRows, ...lessonRows];
  }, [filteredNav, remote]);

  useEffect(() => {
    setActiveIndex(0);
  }, [rows.length, query]);

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDownInput(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[activeIndex];
      if (row) go(row.href);
    }
  }

  if (!open) return null;

  const isShortQuery = query.trim().length < 2;
  const showEmpty =
    !isShortQuery &&
    !pending &&
    filteredNav.length === 0 &&
    remote.people.length === 0 &&
    remote.lessons.length === 0;

  let rowCursor = -1;

  return (
    <div className="fixed inset-0 z-70">
      <button
        type="button"
        className="absolute inset-0 bg-[#000C4A]/45 backdrop-blur-[2px]"
        aria-label="Zamknij wyszukiwanie"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wyszukiwanie"
        className="search-slide-in tutor-panel-surface absolute top-2 bottom-2 left-21 z-10 flex w-[min(25rem,calc(100vw-6.25rem))] flex-col overflow-hidden rounded-[1.75rem] sm:top-3 sm:bottom-3 sm:left-22 sm:w-104"
      >
        <div className="flex items-center gap-2.5 border-b border-panel-frame/40 px-4 py-3.5">
          <IconSearch className="h-4.5 w-4.5 shrink-0 text-depths/40" strokeWidth={2.1} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDownInput}
            placeholder={placeholder}
            className="dash-sans min-w-0 flex-1 bg-transparent text-[0.95rem] text-depths placeholder:text-depths/35 focus:outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Zamknij wyszukiwanie"
            className="dash-sans hidden shrink-0 rounded-md bg-mist px-1.5 py-0.5 text-[10px] font-bold text-depths/45 transition hover:bg-depths/10 hover:text-depths/70 sm:inline-block"
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {filteredNav.length > 0 ? (
            <div className="mb-1">
              <p className="dash-sans px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-depths/40">
                Przejdź do
              </p>
              {filteredNav.map((item) => {
                rowCursor += 1;
                const idx = rowCursor;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => go(item.href)}
                    className={`dash-sans flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left text-sm font-semibold transition ${
                      activeIndex === idx ? "landing-navy text-lime" : "text-depths hover:bg-mist"
                    }`}
                  >
                    <item.Icon className="h-4 w-4 shrink-0" strokeWidth={2.1} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {remote.people.length > 0 ? (
            <div className="mb-1">
              <p className="dash-sans px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-depths/40">
                {personLabel}
              </p>
              {remote.people.map((p) => {
                rowCursor += 1;
                const idx = rowCursor;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => go(p.href)}
                    className={`flex w-full flex-col items-start rounded-2xl px-2.5 py-2 text-left transition ${
                      activeIndex === idx ? "landing-navy text-lime" : "hover:bg-mist"
                    }`}
                  >
                    <span className="dash-sans truncate text-sm font-semibold">{p.title}</span>
                    <span
                      className={`truncate text-xs ${activeIndex === idx ? "text-lime/70" : "text-depths/50"}`}
                    >
                      {p.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {remote.lessons.length > 0 ? (
            <div className="mb-1">
              <p className="dash-sans px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-depths/40">
                Lekcje
              </p>
              {remote.lessons.map((l) => {
                rowCursor += 1;
                const idx = rowCursor;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => go(l.href)}
                    className={`flex w-full flex-col items-start rounded-2xl px-2.5 py-2 text-left transition ${
                      activeIndex === idx ? "landing-navy text-lime" : "hover:bg-mist"
                    }`}
                  >
                    <span className="dash-sans truncate text-sm font-semibold">{l.title}</span>
                    <span
                      className={`truncate text-xs ${activeIndex === idx ? "text-lime/70" : "text-depths/50"}`}
                    >
                      {l.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {pending ? (
            <p className="dash-sans px-2.5 py-3 text-center text-xs font-semibold text-depths/40">
              Szukam…
            </p>
          ) : null}

          {showEmpty ? (
            <p className="dash-sans px-2.5 py-3 text-center text-xs font-semibold text-depths/40">
              Brak wyników dla „{query.trim()}”
            </p>
          ) : null}

          {isShortQuery && hints.length > 0 ? (
            <div className="px-2.5 py-3">
              <p className="dash-sans text-center text-xs font-semibold text-depths/35">
                Spróbuj wpisać, np.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {hints.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => setQuery(hint)}
                    className="dash-sans rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-depths/70 transition hover:bg-depths/10"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="hidden items-center gap-3 border-t border-panel-frame/40 px-4 py-2 text-[10px] font-semibold text-depths/35 sm:flex">
          <span>↑↓ nawiguj</span>
          <span>↵ wybierz</span>
          <span>Esc zamknij</span>
        </div>
      </div>
    </div>
  );
}
