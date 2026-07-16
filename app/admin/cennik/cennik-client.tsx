"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveSubjectRequest,
  notifyCennikUpdate,
  rejectSubjectRequest,
  savePriceTiers,
} from "@/lib/actions/admin";
import type { SubjectRequest } from "@/lib/types/database";
import type { PriceTier } from "@/lib/types/messages";

type Row = { id?: string; label: string; client: number; worker: number };

function tiersToRows(tiers: PriceTier[]): Row[] {
  if (tiers.length === 0) {
    return [
      { label: "Szkoła podstawowa", client: 60, worker: 42 },
      { label: "Szkoła średnia", client: 70, worker: 49 },
      { label: "Matura", client: 80, worker: 56 },
    ];
  }
  return tiers.map((t) => ({
    id: t.id,
    label: t.label,
    client: Number(t.client_rate_pln),
    worker: Number(t.worker_rate_pln),
  }));
}

export function CennikClient({
  pendingRequests,
  initialTiers,
}: {
  pendingRequests: SubjectRequest[];
  initialTiers: PriceTier[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>(() => tiersToRows(initialTiers));
  const [draftRows, setDraftRows] = useState<Row[]>(() => tiersToRows(initialTiers));
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(pendingRequests);

  const handleApprove = (req: SubjectRequest) => {
    startTransition(async () => {
      await approveSubjectRequest(req.id, req.subject, req.tutor_id);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      router.refresh();
    });
  };

  const handleReject = (id: string) => {
    startTransition(async () => {
      await rejectSubjectRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  };

  const handleSaveCennik = () => {
    const cleaned = draftRows.filter((r) => r.label.trim());
    if (cleaned.length === 0) return;
    setRows(cleaned);
    setOpen(false);
    startTransition(async () => {
      await savePriceTiers(
        cleaned.map((r, i) => ({
          id: r.id,
          label: r.label,
          client: r.client,
          worker: r.worker,
          sortOrder: i,
        })),
      );
      await notifyCennikUpdate();
      router.refresh();
    });
  };

  const addDraftRow = () => {
    setDraftRows((prev) => [...prev, { label: "", client: 60, worker: 42 }]);
  };

  const removeDraftRow = (index: number) => {
    setDraftRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-depths text-2xl font-semibold tracking-tight">Cennik i przedmioty</h1>
          <p className="text-muted mt-1 text-sm">
            Cennik zapisywany w bazie. Po zapisie tutorzy dostają powiadomienie w skrzynce wewnętrznej.
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

      <section className="rounded-app border-2 border-panel-frame bg-snow px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-depths text-base font-semibold tracking-tight sm:text-lg">Aktualny cennik</h2>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="table-fixed w-full min-w-0 border-collapse text-left">
            <thead>
              <tr className="border-b border-panel-frame/40">
                <th className="text-muted pb-2.5 text-xs font-medium">Poziom</th>
                <th className="text-muted pb-2.5 text-right text-xs font-medium">Klient</th>
                <th className="text-muted pb-2.5 text-right text-xs font-medium">Pracownik</th>
                <th className="text-muted pb-2.5 text-right text-xs font-medium">Marża</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.label}-${i}`} className={i > 0 ? "border-t border-panel-frame/35" : ""}>
                  <th className="text-depths py-2.5 text-sm font-bold">{r.label}</th>
                  <td className="py-2.5 text-right text-sm font-bold tabular-nums">{r.client} zł</td>
                  <td className="py-2.5 text-right text-sm font-bold tabular-nums">{r.worker} zł</td>
                  <td className="py-2.5 text-right text-sm font-bold tabular-nums text-emerald-900">{r.client - r.worker} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-4">
        <h2 className="text-depths font-semibold">Oczekujące przedmioty</h2>
        <ul className="mt-2 space-y-2">
          {requests.length === 0 ? (
            <li className="text-muted text-sm">Brak oczekujących zgłoszeń.</li>
          ) : (
            requests.map((p) => (
              <li key={p.id} className="rounded-app bg-luster/60 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold">{p.profiles?.full_name ?? "Korepetytor"}</span> · {p.subject}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-full bg-green-700 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                      onClick={() => handleApprove(p)}
                    >
                      Zatwierdź
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-60"
                      onClick={() => handleReject(p.id)}
                    >
                      Odrzuć
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-[#000C4A]/50" onClick={() => setOpen(false)} aria-label="zamknij" />
          <div className="relative z-10 max-h-[min(90vh,720px)] w-full max-w-3xl overflow-y-auto rounded-app border border-panel-frame/40 bg-snow p-4 sm:p-6">
            <h3 className="text-depths text-lg font-semibold">Edycja cennika</h3>
            <p className="text-muted mt-1 text-xs">Dodaj kolejne poziomy stawek — każdy wiersz to osobna pozycja cennika.</p>
            <div className="mt-4 space-y-3">
              {draftRows.map((r, i) => (
                <div key={`cennik-draft-${i}`} className="grid grid-cols-1 gap-3 rounded-app border border-panel-frame/25 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                  <input
                    value={r.label}
                    placeholder="Nazwa poziomu"
                    onChange={(e) => setDraftRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))}
                    className="rounded-app border px-2.5 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={r.client}
                    onChange={(e) => setDraftRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, client: Number(e.target.value) } : x)))}
                    className="rounded-app border px-2.5 py-2 text-sm tabular-nums"
                  />
                  <input
                    type="number"
                    value={r.worker}
                    onChange={(e) => setDraftRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, worker: Number(e.target.value) } : x)))}
                    className="rounded-app border px-2.5 py-2 text-sm tabular-nums"
                  />
                  <input value={`${r.client - r.worker} zł`} readOnly className="rounded-app border bg-luster px-2.5 py-2 text-sm font-semibold text-green-800" />
                  <button
                    type="button"
                    onClick={() => removeDraftRow(i)}
                    className="rounded-full border border-red-300 px-2 py-1 text-xs font-bold text-red-700"
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addDraftRow}
              className="mt-3 rounded-full border border-panel-frame/40 px-3 py-1.5 text-xs font-bold text-depths"
            >
              + Dodaj pozycję cennika
            </button>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border px-3 py-1.5 text-xs font-semibold">
                Anuluj
              </button>
              <button type="button" onClick={handleSaveCennik} disabled={pending} className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime disabled:opacity-60">
                Zapisz i powiadom
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
