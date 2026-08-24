"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveSubjectRequest,
  rejectSubjectRequest,
  savePriceTiers,
} from "@/lib/actions/admin";
import { Spinner, useToast } from "@/components/ui/toast";
import type { SubjectRequest } from "@/lib/types/database";
import type { PriceTier } from "@/lib/types/messages";

type Row = { id?: string; label: string; client: number; worker: number };

function tiersToRows(tiers: PriceTier[]): Row[] {
  if (tiers.length === 0) {
    return [
      { label: "Szkoła podstawowa", client: 50, worker: 40 },
      { label: "Szkoła średnia - poziom podstawowy", client: 60, worker: 45 },
      { label: "Szkoła średnia - poziom rozszerzony", client: 70, worker: 50 },
      { label: "Matura - poziom podstawowy", client: 70, worker: 50 },
      { label: "Matura - poziom rozszerzony", client: 80, worker: 60 },
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
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [acting, setActing] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>(() => tiersToRows(initialTiers));
  const [draftRows, setDraftRows] = useState<Row[]>(() => tiersToRows(initialTiers));
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState(pendingRequests);

  const handleApprove = (req: SubjectRequest) => {
    setActing(`approve-${req.id}`);
    startTransition(async () => {
      try {
        await approveSubjectRequest(req.id, req.subject, req.tutor_id);
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        toast.success("Zatwierdzono przedmiot", req.subject);
        router.refresh();
      } catch (e) {
        toast.error(
          "Nie udało się zatwierdzić",
          e instanceof Error ? e.message : "Spróbuj jeszcze raz.",
        );
      } finally {
        setActing(null);
      }
    });
  };

  const handleReject = (id: string) => {
    const subject = requests.find((r) => r.id === id)?.subject;
    setActing(`reject-${id}`);
    startTransition(async () => {
      try {
        await rejectSubjectRequest(id);
        setRequests((prev) => prev.filter((r) => r.id !== id));
        toast.success("Odrzucono wniosek", subject);
        router.refresh();
      } catch (e) {
        toast.error(
          "Nie udało się odrzucić",
          e instanceof Error ? e.message : "Spróbuj jeszcze raz.",
        );
      } finally {
        setActing(null);
      }
    });
  };

  const handleSaveCennik = () => {
    const cleaned = draftRows.filter((r) => r.label.trim());
    if (cleaned.length === 0) return;
    setActing("save");
    startTransition(async () => {
      try {
        await savePriceTiers(
          cleaned.map((r, i) => ({
            id: r.id,
            label: r.label,
            client: r.client,
            worker: r.worker,
            sortOrder: i,
          })),
        );
        setRows(cleaned);
        setOpen(false);
        toast.success("Zapisano cennik", "Stawki są już widoczne u nauczycieli.");
        router.refresh();
      } catch (e) {
        toast.error(
          "Nie udało się zapisać cennika",
          e instanceof Error ? e.message : "Spróbuj jeszcze raz.",
        );
      } finally {
        setActing(null);
      }
    });
  };

  const addDraftRow = () => {
    setDraftRows((prev) => [...prev, { label: "", client: 50, worker: 40 }]);
  };

  const removeDraftRow = (index: number) => {
    setDraftRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight">Cennik i przedmioty</h1>
          <span className="mt-1.5 block h-1 w-10 rounded-full bg-lime" aria-hidden />
          <p className="dash-sans text-muted mt-1.5 text-sm">
            Cennik zapisujemy od razu. Nauczyciele zobaczą nowe stawki w Finansach.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraftRows(rows);
            setOpen(true);
          }}
          className="dash-sans btn-block bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime"
        >
          Edytuj cały cennik
        </button>
      </div>

      <section className="card-quiet px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="section-label">Aktualny cennik</h2>
        <div className="mt-4 min-w-0 overflow-x-auto">
          <table className="table-fixed w-full min-w-0 border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-paper">
                <th className="section-label !text-muted pb-2.5">Poziom</th>
                <th className="section-label !text-muted pb-2.5 text-right">Klient</th>
                <th className="section-label !text-muted pb-2.5 text-right">Pracownik</th>
                <th className="section-label !text-muted pb-2.5 text-right">Marża</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.label}-${i}`} className="border-b-2 border-paper last:border-0">
                  <th className="dash-sans text-depths py-2.5 text-sm font-bold">{r.label}</th>
                  <td className="dash-mono py-2.5 text-right text-sm font-bold">{r.client} zł</td>
                  <td className="dash-mono py-2.5 text-right text-sm font-bold">{r.worker} zł</td>
                  <td className="dash-mono py-2.5 text-right text-sm font-bold text-depths">{r.client - r.worker} zł</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-quiet p-4">
        <h2 className="section-label">Oczekujące przedmioty</h2>
        <ul className="mt-2 space-y-0">
          {requests.length === 0 ? (
            <li className="dash-sans text-muted text-sm">Brak oczekujących zgłoszeń.</li>
          ) : (
            requests.map((p) => (
              <li key={p.id} className="dash-sans border-b-2 border-paper py-2.5 text-sm last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p>
                    <span className="font-semibold">{p.profiles?.full_name ?? "Korepetytor"}</span> · {p.subject}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={pending}
                      className="badge-done inline-flex items-center gap-1 disabled:opacity-60"
                      onClick={() => handleApprove(p)}
                    >
                      {acting === `approve-${p.id}` ? <Spinner className="h-3 w-3" /> : null}
                      Zatwierdź
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex items-center gap-1 rounded-ledger bg-mist px-2.5 py-1 text-[11px] font-bold text-steel disabled:opacity-60"
                      onClick={() => handleReject(p.id)}
                    >
                      {acting === `reject-${p.id}` ? <Spinner className="h-3 w-3" /> : null}
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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50"
            onClick={() => setOpen(false)}
            aria-label="zamknij"
          />
          <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-3xl flex-col overflow-hidden rounded-t-app border border-panel-frame/40 bg-snow sm:rounded-app">
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
            <div className="shrink-0 px-4 pt-3 sm:px-5 sm:pt-5">
              <h3 className="dash-sans text-depths text-lg font-bold">Edycja cennika</h3>
              <p className="dash-sans text-muted mt-0.5 text-xs">
                Każdy wiersz to osobna pozycja stawek.
              </p>
            </div>

            <div className="mt-3 min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5">
              <div className="dash-sans text-muted mb-1.5 hidden grid-cols-[minmax(0,1.4fr)_5.5rem_5.5rem_5.5rem_auto] gap-2 px-1 text-[10px] font-bold uppercase tracking-wide sm:grid">
                <span>Poziom</span>
                <span className="text-right">Klient</span>
                <span className="text-right">Pracownik</span>
                <span className="text-right">Marża</span>
                <span className="w-14" />
              </div>
              <div className="space-y-1.5">
                {draftRows.map((r, i) => (
                  <div
                    key={`cennik-draft-${i}`}
                    className="grid grid-cols-2 items-center gap-1.5 rounded-app border border-panel-frame/25 p-2 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_5.5rem_5.5rem_auto] sm:gap-2 sm:px-2 sm:py-1.5"
                  >
                    <input
                      value={r.label}
                      placeholder="Nazwa poziomu"
                      aria-label="Poziom"
                      onChange={(e) =>
                        setDraftRows((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)),
                        )
                      }
                      className="dash-sans col-span-2 rounded-app border border-panel-frame/40 px-2 py-1.5 text-sm sm:col-span-1"
                    />
                    <label className="flex min-w-0 flex-col gap-0.5 sm:contents">
                      <span className="dash-sans text-muted text-[10px] font-bold uppercase sm:hidden">
                        Klient
                      </span>
                      <input
                        type="number"
                        value={r.client}
                        aria-label="Stawka klienta"
                        onChange={(e) =>
                          setDraftRows((prev) =>
                            prev.map((x, idx) =>
                              idx === i ? { ...x, client: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className="dash-mono w-full rounded-app border border-panel-frame/40 px-2 py-1.5 text-right text-sm"
                      />
                    </label>
                    <label className="flex min-w-0 flex-col gap-0.5 sm:contents">
                      <span className="dash-sans text-muted text-[10px] font-bold uppercase sm:hidden">
                        Pracownik
                      </span>
                      <input
                        type="number"
                        value={r.worker}
                        aria-label="Stawka pracownika"
                        onChange={(e) =>
                          setDraftRows((prev) =>
                            prev.map((x, idx) =>
                              idx === i ? { ...x, worker: Number(e.target.value) } : x,
                            ),
                          )
                        }
                        className="dash-mono w-full rounded-app border border-panel-frame/40 px-2 py-1.5 text-right text-sm"
                      />
                    </label>
                    <div className="dash-mono rounded-app border border-mist bg-paper px-2 py-1.5 text-right text-sm font-semibold text-depths">
                      {r.client - r.worker} zł
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraftRow(i)}
                      className="dash-sans col-span-2 rounded-app border border-claret/40 px-2 py-1.5 text-xs font-bold text-claret sm:col-span-1 sm:w-14"
                    >
                      Usuń
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-panel-frame/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-5">
              <button
                type="button"
                onClick={addDraftRow}
                className="dash-sans rounded-app border border-panel-frame/40 px-3 py-1.5 text-xs font-bold text-depths touch-manipulation"
              >
                + Dodaj pozycję
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="dash-sans rounded-app border px-3 py-1.5 text-xs font-semibold touch-manipulation"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveCennik}
                  disabled={pending}
                  className="dash-sans btn-block inline-flex items-center justify-center gap-1.5 bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime disabled:opacity-60 touch-manipulation"
                >
                  {acting === "save" ? <Spinner className="h-3 w-3" /> : null}
                  Zapisz
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
