"use client";

import { useState } from "react";
import { ADMIN_PENDING_SUBJECTS } from "@/lib/admin-demo";

type Row = { label: string; client: number; worker: number };

const INITIAL_ROWS: Row[] = [
  { label: "Szkoła podstawowa", client: 60, worker: 42 },
  { label: "Szkoła średnia", client: 70, worker: 49 },
  { label: "Matura", client: 80, worker: 56 },
];

export default function AdminCennikPage() {
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [draftRows, setDraftRows] = useState(INITIAL_ROWS);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(ADMIN_PENDING_SUBJECTS);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-depths text-2xl font-semibold tracking-tight">Cennik i przedmioty</h1>
          <p className="text-muted mt-1 text-sm">
            Ceny za godzinę: <strong className="font-semibold text-depths/90">kwota dla klienta</strong>,{" "}
            <strong className="font-semibold text-depths/90">stawka dla pracownika</strong> oraz wyliczana{" "}
            <strong className="font-semibold text-depths/90">marża</strong> (różnica). Poniżej akceptacja przedmiotów.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraftRows(rows);
            setOpen(true);
          }}
          className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime"
        >
          Edytuj cały cennik
        </button>
      </div>

      <section
        aria-labelledby="admin-cennik-table-title"
        className="rounded-app border-2 border-panel-frame bg-snow px-4 py-4 sm:px-5 sm:py-5"
      >
        <h2 id="admin-cennik-table-title" className="text-depths text-base font-semibold tracking-tight sm:text-lg">
          Aktualny cennik
        </h2>
        <p className="text-muted mt-2 text-xs leading-relaxed sm:text-[0.8125rem]">
          Wszystkie kwoty dotyczą <span className="font-semibold text-depths/85">jednej godziny zajęć</span>.{" "}
          <span className="font-semibold text-depths/85">Kwota dla klienta</span> — cena dla kursanta;{" "}
          <span className="font-semibold text-depths/85">stawka dla pracownika</span> — wypłata nauczyciela;{" "}
          <span className="font-semibold text-depths/85">marża</span> — różnica (pozostaje po stronie organizacji).
        </p>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="w-full min-w-0 border-collapse text-left table-fixed">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-panel-frame/40">
                <th scope="col" className="pb-2.5 pr-3 align-bottom text-xs font-medium text-muted">
                  Poziom
                </th>
                <th
                  scope="col"
                  className="pb-2.5 px-1.5 text-right align-bottom text-[0.65rem] font-medium leading-snug text-muted sm:text-xs"
                >
                  Kwota dla klienta
                </th>
                <th
                  scope="col"
                  className="pb-2.5 px-1.5 text-right align-bottom text-[0.65rem] font-medium leading-snug text-muted sm:text-xs"
                >
                  Stawka dla pracownika
                </th>
                <th
                  scope="col"
                  className="pb-2.5 px-1.5 text-right align-bottom text-[0.65rem] font-medium leading-snug text-muted sm:text-xs"
                >
                  Marża
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const margin = r.client - r.worker;
                return (
                  <tr key={r.label} className={`border-panel-frame/35 ${i > 0 ? "border-t" : ""}`}>
                    <th scope="row" className="text-depths py-2.5 pr-2 text-left text-sm font-bold leading-snug">
                      {r.label}
                    </th>
                    <td className="text-depths py-2.5 px-1.5 text-right text-sm font-bold tabular-nums whitespace-nowrap sm:px-2">
                      {r.client} zł
                    </td>
                    <td className="text-depths py-2.5 px-1.5 text-right text-sm font-bold tabular-nums whitespace-nowrap sm:px-2">
                      {r.worker} zł
                    </td>
                    <td className="py-2.5 px-1.5 text-right text-sm font-bold tabular-nums whitespace-nowrap text-emerald-900 sm:px-2">
                      {margin} zł
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-4">
        <h2 className="text-depths font-semibold">Oczekujące przedmioty</h2>
        <ul className="mt-2 space-y-2">
          {pending.map((p) => (
            <li key={p.id} className="rounded-app bg-luster/60 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p>
                  <span className="font-semibold">{p.tutorName}</span> · {p.subject} · {p.level}
                </p>
                <div className="flex gap-1.5">
                  <button className="rounded-full bg-green-700 px-2.5 py-1 text-[11px] font-bold text-white" onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}>Zatwierdź</button>
                  <button className="rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white" onClick={() => setPending((prev) => prev.filter((x) => x.id !== p.id))}>Odrzuć</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-[#000C4A]/50" onClick={() => setOpen(false)} aria-label="zamknij" />
          <div className="relative z-10 max-h-[min(90vh,720px)] w-full max-w-3xl overflow-y-auto rounded-app border border-panel-frame/40 bg-snow p-4 sm:p-6">
            <h3 className="text-depths text-lg font-semibold">Edycja cennika</h3>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              <span className="font-medium text-depths/85">Kwota dla klienta</span> — cena dla kursanta;{" "}
              <span className="font-medium text-depths/85">stawka dla pracownika</span> — wypłata nauczyciela;{" "}
              <span className="font-medium text-depths/85">marża</span> — nadwyżka (auto z różnicy).
            </p>
            <div className="mt-4 hidden gap-x-3 text-[0.65rem] font-semibold uppercase tracking-wide text-muted sm:grid sm:grid-cols-[minmax(0,1.65fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)]">
              <span>Poziom</span>
              <span className="text-right">Klient (zł/h)</span>
              <span className="text-right">Pracownik (zł/h)</span>
              <span className="text-right">Marża</span>
            </div>
            <div className="mt-2 space-y-3 sm:space-y-2.5">
              {draftRows.map((r, i) => (
                <div
                  key={`cennik-draft-${i}`}
                  className="grid grid-cols-1 gap-3 rounded-app border border-panel-frame/25 p-3 sm:grid-cols-[minmax(0,1.65fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)] sm:gap-x-3 sm:border-0 sm:p-0"
                >
                  <label className="grid min-w-0 gap-1">
                    <span className="text-muted text-[0.65rem] font-semibold sm:sr-only">Poziom</span>
                    <input
                      value={r.label}
                      onChange={(e) =>
                        setDraftRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                      }
                      className="text-depths box-border w-full min-w-0 rounded-app border border-panel-frame/30 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-muted text-[0.65rem] font-semibold sm:sr-only">Kwota dla klienta</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={r.client}
                      onChange={(e) =>
                        setDraftRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, client: Number(e.target.value) } : x)))
                      }
                      className="text-depths box-border w-full min-w-0 rounded-app border border-panel-frame/30 px-2.5 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-muted text-[0.65rem] font-semibold sm:sr-only">Stawka dla pracownika</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={r.worker}
                      onChange={(e) =>
                        setDraftRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, worker: Number(e.target.value) } : x)))
                      }
                      className="text-depths box-border w-full min-w-0 rounded-app border border-panel-frame/30 px-2.5 py-2 text-sm tabular-nums"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1">
                    <span className="text-muted text-[0.65rem] font-semibold sm:sr-only">Marża (automat.)</span>
                    <input
                      value={`${r.client - r.worker} zł`}
                      readOnly
                      className="box-border w-full min-w-0 rounded-app border border-panel-frame/20 bg-luster px-2.5 py-2 text-sm font-semibold tabular-nums text-green-800"
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-full border border-panel-frame/35 px-3 py-1.5 text-xs font-semibold">Anuluj</button>
              <button
                onClick={() => {
                  setRows(draftRows);
                  setOpen(false);
                }}
                className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
