"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { updateTutorPitIdentity, updateTutorTaxYearEntry } from "@/lib/actions/admin";
import { EMPLOYMENT_TYPES, EMPTY_TAX_YEAR, type TutorPitYearSummary } from "@/lib/types/pit";
import type { AdminTutorSummary } from "@/lib/types/database";

const inputClass = "dash-sans w-full rounded-app border border-panel-frame/40 px-3 py-2 text-sm";

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

function formatDatePl(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(y!, (m ?? 1) - 1, 15),
  );
}

function employmentLabel(value: string | null | undefined): string {
  return EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? "-";
}

type IdentityDraft = {
  pesel: string;
  birthDate: string;
  taxStreet: string;
  taxPostalCode: string;
  taxCity: string;
  taxCountry: string;
  taxOffice: string;
  nip: string;
  employmentType: string;
};

function identityFromTutor(tutor: AdminTutorSummary): IdentityDraft {
  return {
    pesel: tutor.pesel ?? "",
    birthDate: tutor.birthDate ?? "",
    taxStreet: tutor.taxStreet ?? "",
    taxPostalCode: tutor.taxPostalCode ?? "",
    taxCity: tutor.taxCity ?? "",
    taxCountry: tutor.taxCountry ?? "Polska",
    taxOffice: tutor.taxOffice ?? "",
    nip: tutor.nip ?? "",
    employmentType: tutor.employmentType ?? "UMOWA_ZLECENIE",
  };
}

/**
 * Panel PIT - domyślnie sztywne informacje; edycja + jeden zapis.
 * Przychody z wypłat PAID aktualizują się automatycznie z kolejnymi miesiącami.
 */
export function TutorPitPanel({
  open,
  onClose,
  tutor,
  yearSummary,
}: {
  open: boolean;
  onClose: () => void;
  tutor: AdminTutorSummary;
  yearSummary: TutorPitYearSummary;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState(yearSummary.year);
  const [feedback, setFeedback] = useState("");
  const [identity, setIdentity] = useState(() => identityFromTutor(tutor));
  const [tax, setTax] = useState(() => yearSummary.taxEntry ?? { ...EMPTY_TAX_YEAR });

  useEffect(() => {
    setYear(yearSummary.year);
    setTax(yearSummary.taxEntry ?? { ...EMPTY_TAX_YEAR });
    setIdentity(identityFromTutor(tutor));
  }, [yearSummary, tutor]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const startY = tutor.contractStart ? Number(tutor.contractStart.slice(0, 4)) : now - 2;
    const endY = tutor.contractEnd ? Number(tutor.contractEnd.slice(0, 4)) : now;
    const from = Math.min(startY, now - 2);
    const to = Math.max(endY, now);
    const list: number[] = [];
    for (let y = to; y >= from; y -= 1) list.push(y);
    return list.length ? list : [now];
  }, [tutor.contractStart, tutor.contractEnd]);

  const income = yearSummary.paidIncomePln;
  const months = yearSummary.months;
  const costs = tax.deductibleCostsPln;
  const taxable = Math.max(0, Math.round((income - costs) * 100) / 100);
  const isB2b = identity.employmentType === "B2B";

  if (!open) return null;

  function changeYear(next: number) {
    setYear(next);
    setEditing(false);
    const url = new URL(window.location.href);
    url.searchParams.set("pitYear", String(next));
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  }

  function cancelEdit() {
    setIdentity(identityFromTutor(tutor));
    setTax(yearSummary.taxEntry ?? { ...EMPTY_TAX_YEAR });
    setEditing(false);
    setFeedback("");
  }

  function saveAll() {
    startTransition(async () => {
      try {
        await updateTutorPitIdentity(tutor.id, {
          pesel: identity.pesel || null,
          birthDate: identity.birthDate || null,
          taxStreet: identity.taxStreet || null,
          taxPostalCode: identity.taxPostalCode || null,
          taxCity: identity.taxCity || null,
          taxCountry: identity.taxCountry || null,
          taxOffice: identity.taxOffice || null,
          nip: identity.nip || null,
          employmentType: identity.employmentType || null,
        });
        await updateTutorTaxYearEntry(tutor.id, year, {
          deductibleCostsPln: tax.deductibleCostsPln,
          taxAdvancesPln: tax.taxAdvancesPln,
          zusSocialPln: tax.zusSocialPln,
          zusHealthPln: tax.zusHealthPln,
          reliefYoung: tax.reliefYoung,
          notes: tax.notes,
        });
        setFeedback("Zapisano dane do PIT.");
        setEditing(false);
        router.refresh();
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Nie udało się zapisać.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij" onClick={onClose} />
      <div className="confirm-dialog-in relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-app border border-panel-frame/40 bg-snow sm:rounded-app">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-panel-frame/30 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="dash-sans text-depths text-lg font-bold">Dane do PIT - {tutor.name}</h2>
            <p className="dash-sans text-muted mt-0.5 text-xs">
              Informacje pod PIT-11. Przychody z wypłat aktualizują się wraz z kolejnymi miesiącami.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setFeedback("");
                }}
                className="dash-sans rounded-full border border-panel-frame/40 bg-transparent px-3 py-1.5 text-xs font-bold text-depths hover:bg-paper"
              >
                Edytuj
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEdit}
                className="dash-sans rounded-full border border-panel-frame/40 bg-transparent px-3 py-1.5 text-xs font-bold text-depths"
              >
                Anuluj
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="dash-sans rounded-full border border-panel-frame/40 px-3 py-1.5 text-xs font-bold text-depths"
            >
              Zamknij
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
          {feedback ? <p className="dash-sans text-xs font-semibold text-[#000C4A]">{feedback}</p> : null}

          {isB2b ? (
            <p className="dash-sans rounded-app border border-butter/50 bg-butter/30 px-3 py-2 text-xs leading-relaxed text-depths">
              Współpraca B2B - zwykle <strong>nie wystawiasz PIT-11</strong>. Poniższe wypłaty służą kontroli kosztów.
            </p>
          ) : (
            <p className="dash-sans text-muted text-xs leading-relaxed">
              PIT-11: do US do końca stycznia, podatnikowi do końca lutego roku następnego.
            </p>
          )}

          {/* Identyfikacja PIT */}
          <section className="rounded-app border border-panel-frame/35 bg-paper/40 p-4">
            <h3 className="section-label">Dane podatkowe</h3>
            {!editing ? (
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Info label="PESEL" value={identity.pesel || "-"} mono />
                <Info label="Data urodzenia" value={formatDatePl(identity.birthDate || null)} mono />
                <Info label="Rodzaj współpracy" value={employmentLabel(identity.employmentType)} />
                <Info label="NIP" value={identity.nip || "-"} mono />
                <Info label="Urząd skarbowy" value={identity.taxOffice || "-"} className="sm:col-span-2" />
                <Info
                  label="Adres zamieszkania"
                  value={
                    [identity.taxStreet, [identity.taxPostalCode, identity.taxCity].filter(Boolean).join(" "), identity.taxCountry]
                      .filter(Boolean)
                      .join(", ") || "-"
                  }
                  className="sm:col-span-2"
                />
              </dl>
            ) : (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <Field label="PESEL">
                  <input
                    value={identity.pesel}
                    onChange={(e) => setIdentity((s) => ({ ...s, pesel: e.target.value }))}
                    className={`dash-mono ${inputClass}`}
                    maxLength={11}
                  />
                </Field>
                <Field label="Data urodzenia">
                  <input
                    type="date"
                    value={identity.birthDate}
                    onChange={(e) => setIdentity((s) => ({ ...s, birthDate: e.target.value }))}
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <Field label="Rodzaj współpracy" className="sm:col-span-2">
                  <select
                    value={identity.employmentType}
                    onChange={(e) => setIdentity((s) => ({ ...s, employmentType: e.target.value }))}
                    className={inputClass}
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="NIP">
                  <input
                    value={identity.nip}
                    onChange={(e) => setIdentity((s) => ({ ...s, nip: e.target.value }))}
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <Field label="Urząd skarbowy">
                  <input
                    value={identity.taxOffice}
                    onChange={(e) => setIdentity((s) => ({ ...s, taxOffice: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Ulica i nr" className="sm:col-span-2">
                  <input
                    value={identity.taxStreet}
                    onChange={(e) => setIdentity((s) => ({ ...s, taxStreet: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Kod pocztowy">
                  <input
                    value={identity.taxPostalCode}
                    onChange={(e) => setIdentity((s) => ({ ...s, taxPostalCode: e.target.value }))}
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <Field label="Miejscowość">
                  <input
                    value={identity.taxCity}
                    onChange={(e) => setIdentity((s) => ({ ...s, taxCity: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Kraj" className="sm:col-span-2">
                  <input
                    value={identity.taxCountry}
                    onChange={(e) => setIdentity((s) => ({ ...s, taxCountry: e.target.value }))}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </section>

          {/* Rok + pieniądze */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="section-label">Rok {year}</h3>
              <label className="dash-sans flex items-center gap-2 text-xs font-semibold text-depths">
                Rok
                <select
                  value={year}
                  onChange={(e) => changeYear(Number(e.target.value))}
                  className="rounded-app border border-panel-frame/40 px-2 py-1 text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="Przychód (wypłaty PAID)" value={formatPln(income)} hint="z systemu" />
              <Kpi label="Koszty uzyskania" value={formatPln(costs)} />
              <Kpi label="Dochód" value={formatPln(taxable)} />
              <Kpi label="Zaliczki PIT" value={formatPln(tax.taxAdvancesPln)} />
            </div>

            <div className="mt-3 overflow-x-auto rounded-app border border-panel-frame/30">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-panel-frame/30 bg-paper">
                    <th className="dash-sans px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      Miesiąc
                    </th>
                    <th className="dash-sans px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-muted">
                      Lekcje
                    </th>
                    <th className="dash-sans px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-muted">
                      Premia
                    </th>
                    <th className="dash-sans px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-muted">
                      Wypłata
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {months.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="dash-sans text-muted px-3 py-3 text-xs">
                        Brak wypłat PAID w {year} - pojawią się automatycznie po oznaczeniu wypłat.
                      </td>
                    </tr>
                  ) : (
                    months.map((m) => (
                      <tr key={m.month} className="border-b border-panel-frame/20 last:border-0">
                        <td className="dash-sans px-3 py-2 capitalize">{monthLabel(m.month)}</td>
                        <td className="dash-mono px-3 py-2 text-right">{formatPln(m.lessonsAmount)}</td>
                        <td className="dash-mono px-3 py-2 text-right">{formatPln(m.bonusAmount)}</td>
                        <td className="dash-mono px-3 py-2 text-right font-bold">{formatPln(m.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {months.length > 0 ? (
                  <tfoot>
                    <tr className="bg-paper/80">
                      <td className="dash-sans px-3 py-2 text-xs font-bold">Suma roku</td>
                      <td />
                      <td />
                      <td className="dash-mono px-3 py-2 text-right font-black">{formatPln(income)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            {!editing ? (
              <dl className="mt-3 grid gap-3 rounded-app border border-panel-frame/30 bg-paper/40 p-4 sm:grid-cols-2">
                <Info label="ZUS społeczne" value={formatPln(tax.zusSocialPln)} mono />
                <Info label="Składka zdrowotna" value={formatPln(tax.zusHealthPln)} mono />
                <Info label="Ulga dla młodych" value={tax.reliefYoung ? "Tak" : "Nie"} />
                <Info label="Notatki" value={tax.notes || "-"} className="sm:col-span-2" />
              </dl>
            ) : (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <Field label="Koszty uzyskania przychodu (zł)">
                  <input
                    type="number"
                    step="0.01"
                    value={tax.deductibleCostsPln}
                    onChange={(e) =>
                      setTax((s) => ({ ...s, deductibleCostsPln: Number(e.target.value) || 0 }))
                    }
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <Field label="Pobrane zaliczki na PIT (zł)">
                  <input
                    type="number"
                    step="0.01"
                    value={tax.taxAdvancesPln}
                    onChange={(e) =>
                      setTax((s) => ({ ...s, taxAdvancesPln: Number(e.target.value) || 0 }))
                    }
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <Field label="Składki ZUS społeczne (zł)">
                  <input
                    type="number"
                    step="0.01"
                    value={tax.zusSocialPln}
                    onChange={(e) => setTax((s) => ({ ...s, zusSocialPln: Number(e.target.value) || 0 }))}
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <Field label="Składka zdrowotna (zł)">
                  <input
                    type="number"
                    step="0.01"
                    value={tax.zusHealthPln}
                    onChange={(e) => setTax((s) => ({ ...s, zusHealthPln: Number(e.target.value) || 0 }))}
                    className={`dash-mono ${inputClass}`}
                  />
                </Field>
                <label className="dash-sans flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={tax.reliefYoung}
                    onChange={(e) => setTax((s) => ({ ...s, reliefYoung: e.target.checked }))}
                    className="size-4"
                  />
                  Ulga dla młodych (do 26. r.ż.)
                </label>
                <Field label="Notatki" className="sm:col-span-2">
                  <textarea
                    value={tax.notes}
                    onChange={(e) => setTax((s) => ({ ...s, notes: e.target.value }))}
                    rows={2}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </section>

          {editing ? (
            <div className="sticky bottom-0 -mx-4 border-t border-panel-frame/30 bg-snow px-4 py-3 sm:-mx-5 sm:px-5">
              <button
                type="button"
                disabled={busy}
                onClick={saveAll}
                className="dash-sans w-full btn-block bg-[#000C4A] px-4 py-2.5 text-sm font-bold text-lime disabled:opacity-60"
              >
                {busy ? "Zapisywanie…" : "Zapisz dane do PIT"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="dash-sans text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={`text-depths mt-0.5 text-sm font-semibold ${mono ? "dash-mono" : "dash-sans"}`}>{value}</dd>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="dash-sans text-xs font-semibold text-depths/80">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-app border border-panel-frame/30 bg-paper/60 px-3 py-2.5">
      <p className="dash-sans text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
        {hint ? <span className="ml-1 font-semibold normal-case tracking-normal opacity-70">· {hint}</span> : null}
      </p>
      <p className="dash-mono text-depths mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
