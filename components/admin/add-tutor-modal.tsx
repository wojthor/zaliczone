"use client";

import { useEffect, useId, useState } from "react";
import type { AdminTutor, AdminTutorStatus } from "@/lib/admin-demo";

const STATUS_OPTIONS: { id: AdminTutorStatus; label: string }[] = [
  { id: "aktywny", label: "Aktywny" },
  { id: "wstrzymany", label: "Wstrzymany" },
  { id: "zablokowany", label: "Zablokowany" },
  { id: "zakonczony", label: "Zakończony" },
];

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomPassword(length = 12): string {
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join("");
}

function loginFromEmail(email: string): string {
  const local = email
    .trim()
    .split("@")[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 28);
  if (local && local.length >= 3) return local;
  return `nauczyciel${Date.now().toString(36).slice(-4)}`;
}

function makeUniqueLogin(base: string, taken: Set<string>): string {
  let candidate = base;
  let n = 0;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

export type AddTutorModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded: (tutor: AdminTutor) => void;
  /** Emaili / loginów już użytych (żeby uniknąć kolizji logowania w demo). */
  takenEmails: string[];
};

type Phase = "form" | "success";

export function AddTutorModal({ open, onClose, onAdded, takenEmails }: AddTutorModalProps) {
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [subjectsRaw, setSubjectsRaw] = useState("");
  const [status, setStatus] = useState<AdminTutorStatus>("aktywny");
  const [creds, setCreds] = useState<{ login: string; password: string } | null>(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhase("form");
    setName("");
    setEmail("");
    setPhone("");
    setBankAccount("");
    setSubjectsRaw("");
    setStatus("aktywny");
    setCreds(null);
    setFormError("");
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subjects = subjectsRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const taken = new Set(takenEmails.map((x) => x.trim().toLowerCase()));
    const emailNorm = email.trim().toLowerCase();
    if (!name.trim() || !emailNorm) return;

    if (taken.has(emailNorm)) {
      setFormError("Ten adres e-mail jest już na liście.");
      return;
    }
    setFormError("");

    const loginBase = loginFromEmail(emailNorm);
    const takenLogins = new Set(
      takenEmails.map((em) => loginFromEmail(em.toLowerCase())),
    );
    const login = makeUniqueLogin(loginBase, takenLogins);
    const password = randomPassword(12);

    const tutor: AdminTutor = {
      id: `t-${crypto.randomUUID().slice(0, 10)}`,
      name: name.trim(),
      email: emailNorm,
      phone: phone.trim() || "—",
      bankAccount: bankAccount.trim() || "—",
      status,
      subjects: subjects.length ? subjects : ["—"],
      students: 0,
      lessonsDoneMonth: 0,
      pendingPln: 0,
      paidPln: 0,
    };

    onAdded(tutor);
    setCreds({ login, password });
    setPhase("success");
  };

  const close = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#000C4A]/50 backdrop-blur-[2px]"
        aria-label="Zamknij"
        onClick={close}
      />
      <div
        className="relative z-10 max-h-[min(90vh,560px)] w-full max-w-md overflow-y-auto rounded-app border border-panel-frame/70 bg-snow/95 p-6 shadow-lg backdrop-blur-sm sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          onClick={close}
          className="text-depths/60 hover:text-depths absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-xl font-light leading-none transition-colors hover:bg-luster/80"
          aria-label="Zamknij"
        >
          ×
        </button>

        {phase === "form" ? (
          <>
            <h2 id={titleId} className="text-depths pr-12 text-lg font-semibold tracking-tight">
              Dodaj nauczyciela
            </h2>
            <p className="text-muted mt-1 pr-10 text-xs leading-relaxed">
              Uzupełnij dane. Po zapisie otrzymasz gotowe dane logowania do przekazania nauczycielowi.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Imię i nazwisko</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm text-depths"
                  autoComplete="name"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">E-mail</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm text-depths"
                  autoComplete="email"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Telefon</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm text-depths"
                  autoComplete="tel"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Numer konta</span>
                <input
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm text-depths"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Przedmioty</span>
                <input
                  value={subjectsRaw}
                  onChange={(e) => setSubjectsRaw(e.target.value)}
                  placeholder="np. Matematyka, Fizyka"
                  className="rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm text-depths placeholder:text-muted"
                />
                <span className="text-muted text-[0.65rem]">Oddziel przecinkiem lub średnikiem.</span>
              </label>
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AdminTutorStatus)}
                  className="rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm font-semibold text-depths"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {formError ? (
                <p className="text-xs font-semibold text-red-700" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-panel-frame/50 px-4 py-2 text-xs font-bold text-depths"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime"
                >
                  Dodaj i utwórz konto
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="add-tutor-success-pop pr-8">
            <div className="flex items-center gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime/90 text-xl font-black text-depths shadow-sm"
                aria-hidden
              >
                ✓
              </span>
              <div>
                <h2 id={titleId} className="text-depths text-lg font-semibold tracking-tight">
                  Dodano nauczyciela
                </h2>
                <p className="text-muted text-xs">Konto jest gotowe — udostępnij poniższe dane logowania.</p>
              </div>
            </div>

            {creds ? (
              <div className="mt-6 space-y-3 rounded-app border border-panel-frame/40 bg-luster/80 p-4">
                <div>
                  <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Login</p>
                  <p className="font-mono mt-1 text-sm font-bold text-depths break-all">{creds.login}</p>
                </div>
                <div>
                  <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Hasło</p>
                  <p className="font-mono mt-1 text-sm font-bold text-depths break-all">{creds.password}</p>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-full bg-[#000C4A] py-2.5 text-xs font-bold text-lime"
            >
              Zamknij
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
