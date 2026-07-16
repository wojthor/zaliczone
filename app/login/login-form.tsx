"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logoFont } from "@/lib/logo-font";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

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
          ? "/"
          : next;

    router.replace(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-luster p-4">
      <div className="w-full max-w-md rounded-app border-2 border-panel-frame bg-snow p-6 shadow-sm sm:p-8">
        <p className={`${logoFont.className} text-depths text-center text-2xl font-bold tracking-tight`}>
          ZALICZONE
        </p>
        <p className="text-muted mt-2 text-center text-sm">Zaloguj się do panelu</p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
              placeholder="twoj@email.pl"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Hasło</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
            />
          </label>

          {error ? (
            <p className="rounded-app bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-[#000C4A] px-4 py-2.5 text-sm font-semibold text-lime disabled:opacity-60"
          >
            {loading ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>
      </div>
    </div>
  );
}
