"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createTutorAccount, uploadTutorPhoto } from "@/lib/actions/admin";
import { BonusProgressBar } from "@/components/bonus-progress-bar";
import { SubjectLevelMultiSelect } from "@/components/admin/subject-level-multi-select";
import { TutorPhotoField } from "@/components/admin/tutor-photo-field";
import { EMPLOYMENT_TYPES } from "@/lib/types/pit";
import type { AdminTutorSummary } from "@/lib/types/database";

const fieldClass = "dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-sm";

type CreateForm = {
  name: string;
  email: string;
  subjects: string[];
  phone: string;
  bank: string;
  olx: string;
  contractStart: string;
  contractEnd: string;
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

const EMPTY_CREATE: CreateForm = {
  name: "",
  email: "",
  subjects: [],
  phone: "",
  bank: "",
  olx: "",
  contractStart: "",
  contractEnd: "",
  pesel: "",
  birthDate: "",
  taxStreet: "",
  taxPostalCode: "",
  taxCity: "",
  taxCountry: "Polska",
  taxOffice: "",
  nip: "",
  employmentType: "UMOWA_ZLECENIE",
};

function formatContractRange(start: string | null, end: string | null): string {
  if (!start && !end) return "umowa: -";
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}.${m}.${y}`;
  };
  if (start && end) return `umowa: ${fmt(start)} – ${fmt(end)}`;
  if (start) return `umowa od ${fmt(start)}`;
  return `umowa do ${fmt(end!)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFormer(t: AdminTutorSummary, today = todayIso()): boolean {
  // Umowa zakończona dziś lub wcześniej → były pracownik (od razu znika z aktywnych).
  return Boolean(t.contractEnd && t.contractEnd <= today);
}

function TutorCard({ t, compact = false }: { t: AdminTutorSummary; compact?: boolean }) {
  const initials = t.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <li className="admin-card p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-start gap-3 sm:w-[38%] sm:max-w-md sm:flex-none">
          {t.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t.photoUrl}
              alt=""
              className="mt-0.5 h-10 w-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="avatar-initials mt-0.5 h-10 w-10 shrink-0 text-xs" aria-hidden>
              {initials || "?"}
            </span>
          )}
          <div className="min-w-0">
            <p className="dash-sans text-depths text-sm font-bold tracking-tight">{t.name}</p>
            <p className="mt-1.5">
              <span
                className={
                  isFormer(t)
                    ? "rounded-ledger bg-mist px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-steel"
                    : t.acceptingStudents
                      ? "badge-action"
                      : "rounded-ledger bg-mist px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-steel"
                }
              >
                {isFormer(t) ? "Były pracownik" : t.acceptingStudents ? "Przyjmuje uczniów" : "Nie chce nowych uczniów"}
              </span>
            </p>
            <p className="dash-sans text-muted mt-1 truncate text-xs">
              <span>{t.phone ?? "brak tel."}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span>{t.email || "brak e-mail"}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span>{formatContractRange(t.contractStart, t.contractEnd)}</span>
            </p>
            <p className="dash-sans text-depths mt-1.5 truncate text-xs font-medium">
              {t.subjects.length === 0 ? (
                <span className="text-muted font-normal">Brak przedmiotów</span>
              ) : (
                t.subjects.join(" · ")
              )}
            </p>
          </div>
        </div>

        {!compact ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-4 sm:gap-5">
            <div className="flex items-center gap-4 text-center">
              <Stat value={String(t.students)} label="uczniów" />
              <Stat value={String(t.lessonsDoneMonth)} label="lekcji" />
              <Stat value={String(t.hoursDoneMonth)} label="godz." />
            </div>
            <BonusProgressBar hoursDone={t.hoursDoneMonth} minimal />
          </div>
        ) : (
          <div className="dash-sans text-muted flex-1 text-xs sm:text-center">
            Zachowany pod rozliczenie PIT - wejdź w profil → Dane do PIT
          </div>
        )}

        <Link
          href={`/admin/nauczyciele/${t.id}`}
          className="dash-sans inline-flex shrink-0 items-center gap-1.5 self-start rounded-app border border-mist bg-transparent px-2.5 py-1.5 text-[0.7rem] font-semibold text-depths transition hover:border-depths/40 hover:bg-paper sm:self-center"
        >
          Wejdź w profil
          <span aria-hidden className="text-sm leading-none">
            →
          </span>
        </Link>
      </div>
    </li>
  );
}

export function NauczycieleClient({
  initialTutors,
  priceLevels,
}: {
  initialTutors: AdminTutorSummary[];
  priceLevels: string[];
}) {
  const router = useRouter();
  const tutors = initialTutors;
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "former">("active");
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<CreateForm>({ ...EMPTY_CREATE });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [creds, setCreds] = useState<{ email: string } | null>(null);
  const [error, setError] = useState("");

  const { active, formerByYear } = useMemo(() => {
    const today = todayIso();
    const activeList: AdminTutorSummary[] = [];
    const byYear = new Map<number, AdminTutorSummary[]>();

    for (const t of tutors) {
      if (isFormer(t, today)) {
        const y = Number((t.contractEnd ?? today).slice(0, 4));
        const list = byYear.get(y) ?? [];
        list.push(t);
        byYear.set(y, list);
      } else {
        activeList.push(t);
      }
    }

    const years = [...byYear.keys()].sort((a, b) => b - a);
    return {
      active: activeList,
      formerByYear: years.map((year) => ({
        year,
        tutors: (byYear.get(year) ?? []).sort((a, b) => a.name.localeCompare(b.name, "pl")),
      })),
    };
  }, [tutors]);

  const formerCount = formerByYear.reduce((s, g) => s + g.tutors.length, 0);

  function openAdd() {
    setForm({ ...EMPTY_CREATE });
    setPhotoFile(null);
    setCreds(null);
    setError("");
    setModalOpen(true);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!email || !name) return;

    startTransition(async () => {
      try {
        const created = await createTutorAccount({
          email,
          fullName: name,
          activeSubjects: form.subjects,
          phone: form.phone || null,
          bankAccount: form.bank || null,
          olxUrl: form.olx || null,
          contractStart: form.contractStart || null,
          contractEnd: form.contractEnd || null,
          pesel: form.pesel || null,
          birthDate: form.birthDate || null,
          taxStreet: form.taxStreet || null,
          taxPostalCode: form.taxPostalCode || null,
          taxCity: form.taxCity || null,
          taxCountry: form.taxCountry || "Polska",
          taxOffice: form.taxOffice || null,
          nip: form.nip || null,
          employmentType: form.employmentType || null,
        });
        if (photoFile) {
          const fd = new FormData();
          fd.set("photo", photoFile);
          await uploadTutorPhoto(created.id, fd);
        }
        setCreds({ email });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się dodać nauczyciela.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight">Nauczyciele</h1>
          <span className="mt-1.5 block h-1 w-10 rounded-full bg-lime" aria-hidden />
          <p className="dash-sans text-muted mt-1.5 text-sm">
            Aktywna kadra i archiwum byłych pracowników. Edycja i dane do PIT - w profilu.
          </p>
        </div>
        {tab === "active" ? (
          <button
            type="button"
            onClick={openAdd}
            className="dash-sans btn-block landing-navy px-4 py-2 text-sm font-bold text-lime"
          >
            + Dodaj nauczyciela
          </button>
        ) : null}
      </div>

      <div
        className="dash-sans inline-flex admin-card !rounded-full p-1 text-xs font-bold"
        role="tablist"
        aria-label="Lista nauczycieli"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          onClick={() => setTab("active")}
          className={`rounded-ledger px-3.5 py-1.5 transition ${
            tab === "active" ? "landing-navy text-lime" : "text-muted hover:text-depths"
          }`}
        >
          Aktywni
          <span className="ml-1.5 tabular-nums opacity-70">{active.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "former"}
          onClick={() => setTab("former")}
          className={`rounded-ledger px-3.5 py-1.5 transition ${
            tab === "former" ? "landing-navy text-lime" : "text-muted hover:text-depths"
          }`}
        >
          Byli pracownicy
          <span className="ml-1.5 tabular-nums opacity-70">{formerCount}</span>
        </button>
      </div>

      {tab === "active" ? (
        <ul className="space-y-3">
          {active.length === 0 ? (
            <li className="dash-sans text-muted card-quiet p-4 text-sm">
              Nie masz jeszcze żadnego nauczyciela. Dodaj pierwszego, żeby zacząć.
            </li>
          ) : (
            active.map((t) => <TutorCard key={t.id} t={t} />)
          )}
        </ul>
      ) : (
        <div className="space-y-5">
          <p className="dash-sans text-muted text-sm">
            Osoby po zakończeniu współpracy - zachowane pod rozliczenie PIT, pogrupowane wg roku odejścia.
          </p>
          {formerCount === 0 ? (
            <p className="dash-sans text-muted card-quiet p-4 text-sm">Brak byłych pracowników.</p>
          ) : (
            formerByYear.map((group) => (
              <section key={group.year}>
                <h2 className="dash-sans text-muted mb-2 text-[11px] font-bold uppercase tracking-[0.12em]">
                  {group.year}
                  <span className="ml-2 font-semibold normal-case tracking-normal opacity-70">
                    · {group.tutors.length}
                  </span>
                </h2>
                <ul className="space-y-2">
                  {group.tutors.map((t) => (
                    <TutorCard key={t.id} t={t} compact />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-depths/50"
            aria-label="Zamknij"
            onClick={() => setModalOpen(false)}
          />
          <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-app border border-mist bg-snow sm:rounded-app">
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
            {creds ? (
              <div className="add-tutor-success-pop p-6">
                <h2 className="dash-sans text-depths text-lg font-bold">Zaproszenie wysłane</h2>
                <p className="dash-sans text-muted mt-1 text-sm leading-relaxed">
                  Na {creds.email} poszedł mail z linkiem do ustawienia hasła. Nauczyciel sam wejdzie
                  do panelu - hasła tu nie pokazujemy.
                </p>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="dash-sans mt-4 w-full btn-block landing-navy py-2 text-xs font-bold text-lime"
                >
                  Zamknij
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdd} className="flex min-h-0 flex-1 flex-col">
                <div className="shrink-0 border-b border-panel-frame/30 px-5 py-4">
                  <h2 className="dash-sans text-depths text-lg font-bold">Dodaj nauczyciela</h2>
                  <p className="dash-sans text-muted mt-0.5 text-xs">
                    Podaj dane podstawowe i podatkowe - potem zobaczysz je w profilu i w „Dane do PIT”.
                  </p>
                </div>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
                  <section className="space-y-3">
                    <h3 className="section-label">Dane podstawowe</h3>
                    <label className="grid gap-1">
                      <span className="dash-sans text-xs font-semibold text-depths/80">Imię i nazwisko *</span>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className={fieldClass}
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="dash-sans text-xs font-semibold text-depths/80">E-mail *</span>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className={fieldClass}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Telefon</span>
                        <input
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Numer konta</span>
                        <input
                          value={form.bank}
                          onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                      <label className="grid gap-1 sm:col-span-2">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Link OLX</span>
                        <input
                          value={form.olx}
                          onChange={(e) => setForm((f) => ({ ...f, olx: e.target.value }))}
                          className={fieldClass}
                          placeholder="https://..."
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Umowa od</span>
                        <input
                          type="date"
                          value={form.contractStart}
                          onChange={(e) => setForm((f) => ({ ...f, contractStart: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Umowa do</span>
                        <input
                          type="date"
                          value={form.contractEnd}
                          onChange={(e) => setForm((f) => ({ ...f, contractEnd: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                    </div>
                    <div className="grid gap-1.5">
                      <span className="dash-sans text-xs font-semibold text-depths/80">
                        Przedmioty i poziomy
                      </span>
                      <SubjectLevelMultiSelect
                        selected={form.subjects}
                        levels={priceLevels}
                        onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
                      />
                    </div>
                    <TutorPhotoField
                      file={photoFile}
                      onFileChange={setPhotoFile}
                      disabled={pending}
                    />
                  </section>

                  <section className="space-y-3 border-t border-panel-frame/25 pt-4">
                    <h3 className="section-label">Dane do PIT</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">PESEL</span>
                        <input
                          value={form.pesel}
                          onChange={(e) => setForm((f) => ({ ...f, pesel: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                          maxLength={11}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Data urodzenia</span>
                        <input
                          type="date"
                          value={form.birthDate}
                          onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                      <label className="grid gap-1 sm:col-span-2">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Rodzaj współpracy</span>
                        <select
                          value={form.employmentType}
                          onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
                          className={fieldClass}
                        >
                          {EMPLOYMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">NIP</span>
                        <input
                          value={form.nip}
                          onChange={(e) => setForm((f) => ({ ...f, nip: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Urząd skarbowy</span>
                        <input
                          value={form.taxOffice}
                          onChange={(e) => setForm((f) => ({ ...f, taxOffice: e.target.value }))}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1 sm:col-span-2">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Ulica i nr</span>
                        <input
                          value={form.taxStreet}
                          onChange={(e) => setForm((f) => ({ ...f, taxStreet: e.target.value }))}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Kod pocztowy</span>
                        <input
                          value={form.taxPostalCode}
                          onChange={(e) => setForm((f) => ({ ...f, taxPostalCode: e.target.value }))}
                          className={`dash-mono ${fieldClass}`}
                        />
                      </label>
                      <label className="grid gap-1">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Miejscowość</span>
                        <input
                          value={form.taxCity}
                          onChange={(e) => setForm((f) => ({ ...f, taxCity: e.target.value }))}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-1 sm:col-span-2">
                        <span className="dash-sans text-xs font-semibold text-depths/80">Kraj</span>
                        <input
                          value={form.taxCountry}
                          onChange={(e) => setForm((f) => ({ ...f, taxCountry: e.target.value }))}
                          className={fieldClass}
                        />
                      </label>
                    </div>
                  </section>
                  {error ? <p className="dash-sans text-xs font-semibold text-claret">{error}</p> : null}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-panel-frame/30 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="dash-sans rounded-full border px-4 py-2.5 text-xs font-bold touch-manipulation"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="dash-sans btn-block landing-navy px-4 py-2.5 text-xs font-bold text-lime disabled:opacity-60 touch-manipulation"
                  >
                    {pending ? "Tworzenie…" : "Utwórz konto"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-11">
      <p className="dash-mono text-depths text-base font-black leading-none">{value}</p>
      <p className="section-label !text-muted mt-0.5">{label}</p>
    </div>
  );
}
