"use client";

import { useMemo, useState } from "react";
import { IconFileDoc, IconFolder } from "@/components/icons";
import { ADMIN_TUTORS } from "@/lib/admin-demo";

type EwidencjaRow = {
  id: string;
  name: string;
  source: string;
  date: string;
  status: "gotowy" | "oczekuje";
  /** Sortowanie i grupowanie, np. "2026-03" lub "firma". */
  monthKey: string;
};

const EWIDENCJA_DEMO: EwidencjaRow[] = [
  {
    id: "e1",
    name: "Ewidencja przychodów — marzec 2026.pdf",
    source: "Księgowość (symulacja)",
    date: "28.03.2026",
    status: "gotowy",
    monthKey: "2026-03",
  },
  {
    id: "e2",
    name: "Zestawienie VAT — Q1 2026.xlsx",
    source: "Księgowość (symulacja)",
    date: "27.03.2026",
    status: "gotowy",
    monthKey: "2026-03",
  },
  {
    id: "e6",
    name: "Ewidencja wypłat — kwiecień 2026.pdf",
    source: "Księgowość (symulacja)",
    date: "—",
    status: "oczekuje",
    monthKey: "2026-04",
  },
  {
    id: "e3",
    name: "Regulamin placówki.pdf",
    source: "Biuro",
    date: "10.01.2026",
    status: "gotowy",
    monthKey: "firma",
  },
  {
    id: "e4",
    name: "Procedura RODO.pdf",
    source: "Biuro",
    date: "10.01.2026",
    status: "gotowy",
    monthKey: "firma",
  },
  {
    id: "e5",
    name: "Instrukcja BHP.pdf",
    source: "Biuro",
    date: "05.01.2026",
    status: "gotowy",
    monthKey: "firma",
  },
];

function monthKeyLabel(key: string): string {
  if (key === "firma") return "Dokumenty ogólne";
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
}

function sortMonthKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === "firma") return 1;
    if (b === "firma") return -1;
    return b.localeCompare(a);
  });
}

type MonthFiles = { monthKey: string; files: string[] };

const EMPLOYEE_MONTH_TEMPLATE: MonthFiles[] = [
  {
    monthKey: "2026-03",
    files: [
      "Ewidencja godzin — marzec.pdf",
      "Zestawienie zajęć — marzec.pdf",
      "Rachunek / rozliczenie — marzec.pdf",
    ],
  },
  {
    monthKey: "2026-02",
    files: ["Ewidencja godzin — luty.pdf", "Zestawienie zajęć — luty.pdf", "Rachunek — luty.pdf"],
  },
  {
    monthKey: "2026-01",
    files: ["Ewidencja godzin — styczeń.pdf", "Rachunek — styczeń.pdf"],
  },
  {
    monthKey: "firma",
    files: ["Umowa współpracy.pdf", "Aneks — stawki 2026.pdf", "Oświadczenie ZUS.pdf"],
  },
];

function countMonthFiles(months: { files: string[] }[]) {
  return months.reduce((n, m) => n + m.files.length, 0);
}

export default function AdminDokumentyPage() {
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  const ewidencjaByMonth = useMemo(() => {
    const map = new Map<string, EwidencjaRow[]>();
    for (const row of EWIDENCJA_DEMO) {
      const list = map.get(row.monthKey) ?? [];
      list.push(row);
      map.set(row.monthKey, list);
    }
    return sortMonthKeys([...map.keys()]).map((key) => ({
      key,
      label: monthKeyLabel(key),
      rows: map.get(key)!,
    }));
  }, []);

  const folders = useMemo(
    () =>
      ADMIN_TUTORS.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())).map((t) => ({
        id: t.id,
        name: t.name,
        months: EMPLOYEE_MONTH_TEMPLATE.map((m) => ({
          monthKey: m.monthKey,
          monthLabel: monthKeyLabel(m.monthKey),
          files: m.files,
        })),
      })),
    [query],
  );

  const monthToggleKey = (tutorId: string, monthKey: string) => `${tutorId}::${monthKey}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-depths text-2xl font-semibold tracking-tight">Dokumenty</h1>
        <p className="text-muted mt-1 text-sm">
          <strong className="font-semibold text-depths/90">Ewidencje</strong> pogrupowane wg miesięcy (z księgowości).{" "}
          <strong className="font-semibold text-depths/90">Pracownicy</strong> — w każdym folderze miesiące z ewidencją godzin i rozliczeniami.
        </p>
      </div>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-4 sm:p-5">
        <h2 className="text-depths text-base font-semibold tracking-tight">Ewidencje</h2>
        <p className="text-muted mt-1 text-xs leading-relaxed">
          Widok wg miesięcy — tak samo będzie układał się import z panelu Księgowość. Na końcu sekcja dokumentów ogólnych (bez miesiąca).
        </p>
        <div className="mt-4 space-y-6 overflow-x-auto">
          {ewidencjaByMonth.map((group) => (
            <div key={group.key}>
              <h3 className="text-depths mb-2 border-b border-panel-frame/35 pb-2 text-sm font-bold capitalize tracking-tight">
                {group.label}
              </h3>
              <table className="w-full min-w-lg table-fixed border-collapse text-left text-sm">
                <thead>
                  <tr className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">
                    <th className="pb-2 pr-3 align-bottom">Nazwa pliku</th>
                    <th className="w-[26%] pb-2 px-2 align-bottom">Źródło</th>
                    <th className="w-30 pb-2 px-2 align-bottom">Data</th>
                    <th className="w-26 pb-2 pl-2 text-right align-bottom">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr key={row.id} className={`border-panel-frame/25 ${i > 0 ? "border-t" : ""}`}>
                      <td className="py-2.5 pr-3 align-middle">
                        <div className="flex items-center gap-2">
                          <IconFileDoc className="h-4 w-4 shrink-0 text-depths/45" />
                          <span className="font-medium leading-snug text-depths">{row.name}</span>
                        </div>
                      </td>
                      <td className="text-depths/80 px-2 py-2.5 align-middle text-xs">{row.source}</td>
                      <td className="text-depths/75 px-2 py-2.5 align-middle text-xs tabular-nums">{row.date}</td>
                      <td className="py-2.5 pl-2 text-right align-middle">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                            row.status === "gotowy"
                              ? "bg-green-700/12 text-green-800"
                              : "bg-butter/80 text-depths"
                          }`}
                        >
                          {row.status === "gotowy" ? "Gotowy" : "Oczekuje"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-4 sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-depths text-base font-semibold tracking-tight">Dokumentacja pracowników</h2>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Kartoteka na dysku: najpierw pracownik, potem <strong className="font-semibold text-depths/85">podfoldery miesięcy</strong> (ewidencja godzin, rozliczenia). Na końcu dokumenty stałe.
            </p>
          </div>
          <label className="grid w-full gap-1 sm:w-auto sm:max-w-xs">
            <span className="text-depths/70 text-[0.65rem] font-semibold uppercase tracking-wide">Szukaj</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Imię pracownika…"
              className="rounded-app border border-panel-frame/40 bg-luster px-3 py-2 text-sm text-depths placeholder:text-muted"
            />
          </label>
        </div>
        <ul className="space-y-2">
          {folders.length === 0 ? (
            <li className="text-muted rounded-app border border-dashed border-panel-frame/40 bg-luster/40 px-4 py-6 text-center text-sm">
              Brak pracowników pasujących do wyszukiwania.
            </li>
          ) : null}
          {folders.map((folder) => {
            const open = !!openFolders[folder.id];
            const fileCount = countMonthFiles(folder.months);
            return (
              <li
                key={folder.id}
                className="overflow-hidden rounded-app border border-panel-frame/30 bg-luster/30 shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-luster/80 sm:px-4 sm:py-3"
                  onClick={() => setOpenFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }))}
                  aria-expanded={open}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000C4A]/8 text-[#000C4A]">
                    <IconFolder className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-depths">{folder.name}</span>
                    <span className="text-muted mt-0.5 block text-[0.65rem] font-medium">
                      {folder.months.length} mies. · {fileCount} plików
                    </span>
                  </span>
                  <span className="text-depths/50 shrink-0 text-lg font-light tabular-nums" aria-hidden>
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open ? (
                  <div className="border-t border-panel-frame/25 bg-snow/90 px-2 py-2 sm:px-4 sm:py-3">
                    <p className="text-muted mb-2 px-1 text-[0.65rem] font-semibold uppercase tracking-wide">
                      Miesiące i pliki
                    </p>
                    <ul className="space-y-1">
                      {folder.months.map((block) => {
                        const mk = monthToggleKey(folder.id, block.monthKey);
                        const monthOpen = !!openMonths[mk];
                        return (
                          <li key={block.monthKey} className="rounded-app border border-panel-frame/20 bg-luster/40">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-depths transition-colors hover:bg-luster/90"
                              onClick={() => setOpenMonths((prev) => ({ ...prev, [mk]: !prev[mk] }))}
                              aria-expanded={monthOpen}
                            >
                              <IconFolder className="h-4 w-4 shrink-0 text-depths/55" />
                              <span className="min-w-0 flex-1 capitalize">{block.monthLabel}</span>
                              <span className="text-muted text-xs font-medium tabular-nums">
                                {block.files.length} pl.
                              </span>
                              <span className="text-depths/45 w-4 text-center" aria-hidden>
                                {monthOpen ? "−" : "+"}
                              </span>
                            </button>
                            {monthOpen ? (
                              <ul className="border-t border-panel-frame/20 bg-snow/95 px-3 py-2 sm:pl-8">
                                {block.files.map((f) => (
                                  <li
                                    key={f}
                                    className="flex items-center gap-2 py-1.5 text-xs text-depths/90 sm:text-sm"
                                  >
                                    <IconFileDoc className="h-3.5 w-3.5 shrink-0 text-depths/40 sm:h-4 sm:w-4" />
                                    <span className="font-medium">{f}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
