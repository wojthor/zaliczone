"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logoFont } from "@/lib/logo-font";
import { dashboardSans } from "@/lib/dashboard-fonts";
import { setInitialPassword } from "@/lib/actions/profile";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError("Link wygasł albo jest nieprawidłowy. Poproś koordynatora o nowe zaproszenie.");
        setReady(false);
        return;
      }
      setReady(true);
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Hasło musi mieć co najmniej 8 znaków.");
      return;
    }
    if (password !== repeat) {
      setError("Hasła nie są takie same.");
      return;
    }
    setLoading(true);
    try {
      await setInitialPassword(password);
      router.replace("/panel");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać hasła.");
      setLoading(false);
    }
  }

  return (
    <div
      className={`relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#000C4A] px-4 py-16 ${dashboardSans.variable}`}
    >
      <div className="relative z-10 w-full max-w-md">
        <p
          className={`${logoFont.className} text-center text-4xl font-extrabold italic uppercase leading-none tracking-tighter text-lime sm:text-5xl`}
        >
          Zaliczone
        </p>
        <p className="dash-sans mt-4 text-center text-lg font-bold uppercase tracking-tight text-snow">
          Ustaw hasło
        </p>

        <form onSubmit={handleSubmit} className="mt-10 grid gap-5">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime/75">Hasło</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-snow outline-none transition focus:border-lime/50"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime/75">
              Powtórz hasło
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-snow outline-none transition focus:border-lime/50"
            />
          </label>
          {error ? <p className="text-center text-sm text-lime">{error}</p> : null}
          <button
            type="submit"
            disabled={!ready || loading}
            className="rounded-full bg-lime px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-depths disabled:opacity-60"
          >
            {loading ? "Zapisuję…" : "Zapisz i wejdź"}
          </button>
        </form>
      </div>
    </div>
  );
}
