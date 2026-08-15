"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logoFont } from "@/lib/logo-font";
import { dashboardSans } from "@/lib/dashboard-fonts";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/panel";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      const message =
        signInError?.message?.toLowerCase().includes("fetch") ||
        signInError?.message?.toLowerCase().includes("network")
          ? "Brak połączenia z Supabase. Sprawdź NEXT_PUBLIC_SUPABASE_URL w .env.local i czy projekt jest aktywny w panelu Supabase."
          : (signInError?.message ?? "Nie udało się zalogować.");
      setError(message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const destination =
      profile?.role === "ADMIN"
        ? next.startsWith("/admin")
          ? next
          : "/admin"
        : next.startsWith("/admin")
          ? "/panel"
          : next;

    router.replace(destination);
    router.refresh();
  }

  return (
    <div
      className={`relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#000C4A] px-4 py-16 ${dashboardSans.variable}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 20% 25%, rgba(213,237,33,0.26), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 75%, rgba(223,253,111,0.16), transparent 50%), linear-gradient(165deg, #000C4A 0%, #001a6e 45%, #00082f 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-md">
        <p
          className={`${logoFont.className} text-center text-4xl font-extrabold italic uppercase leading-none tracking-tighter text-lime sm:text-5xl`}
        >
          Zaliczone
        </p>
        <p className="dash-sans mt-4 text-center text-lg font-bold tracking-tight text-snow">
          PANEL KOREPETYTORA
        </p>

        <form onSubmit={handleSubmit} className="mt-10 grid gap-5">
          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime/75">
              E-mail
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-snow placeholder:text-luster/40 outline-none transition focus:border-lime/50 focus:bg-white/15"
              placeholder="twoj@email.pl"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime/75">
              Hasło
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-snow placeholder:text-luster/40 outline-none transition focus:border-lime/50 focus:bg-white/15"
            />
          </label>

          {error ? (
            <p
              className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-luster"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex items-center justify-center rounded-full bg-lime px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-depths transition enabled:hover:brightness-105 disabled:opacity-60"
          >
            {loading ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm">
          <a
            href="/"
            className="font-semibold text-luster/80 underline decoration-white/30 underline-offset-4 transition hover:text-lime"
          >
            ← Strona główna
          </a>
        </p>
      </div>
    </div>
  );
}
