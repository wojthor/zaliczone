"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { parseRequiredTests, parseTestResults } from "@/lib/recruitment/test-links";
import type { Candidate, CandidateStatus } from "@/lib/types/database";
import { CandidateProfileModal } from "./candidate-profile-modal";

const STATUS_LABEL: Record<CandidateStatus, string> = {
  NEW: "Nowy",
  IN_PROGRESS: "W toku",
  REJECTED: "Odrzucony",
  HIRED: "Zatrudniony",
};

const STATUS_BADGE: Record<CandidateStatus, string> = {
  NEW: "bg-[#000C4A]/10 text-depths",
  IN_PROGRESS: "bg-toffee/20 text-toffee",
  REJECTED: "bg-claret/10 text-claret",
  HIRED: "bg-lime/40 text-depths",
};

export function RekrutacjaClient({ initialCandidates }: { initialCandidates: Candidate[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"ALL" | CandidateStatus>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const rows = useMemo(() => {
    if (filter === "ALL") return initialCandidates;
    return initialCandidates.filter((c) => c.status === filter);
  }, [initialCandidates, filter]);

  const selected = useMemo(
    () => initialCandidates.find((c) => c.id === selectedId) ?? null,
    [initialCandidates, selectedId],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: initialCandidates.length };
    for (const s of Object.keys(STATUS_LABEL) as CandidateStatus[]) {
      map[s] = initialCandidates.filter((c) => c.status === s).length;
    }
    return map;
  }, [initialCandidates]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight sm:text-3xl">
            Rekrutacja
          </h1>
          <span className="mt-1.5 block h-1 w-10 rounded-full bg-lime" aria-hidden />
          <p className="dash-sans text-muted mt-1.5 text-sm">
            Profile kandydatów · jeden test na przedmiot (najwyższy poziom)
          </p>
        </div>
        <p className="dash-mono text-muted text-xs font-semibold tabular-nums">
          {initialCandidates.length} osób
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["ALL", "Wszyscy"],
            ["NEW", "Nowi"],
            ["IN_PROGRESS", "W toku"],
            ["HIRED", "Zatrudnieni"],
            ["REJECTED", "Odrzuceni"],
          ] as const
        ).map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`dash-sans rounded-full px-3 py-1.5 text-[0.7rem] font-bold transition ${
                active
                  ? "bg-[#000C4A] text-lime"
                  : "border border-panel-frame/40 bg-snow text-muted hover:bg-paper"
              }`}
            >
              {label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-lime/80" : "text-muted/70"}`}>
                {counts[key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="dash-sans text-muted soft-panel px-4 py-10 text-center text-sm">
          Brak kandydatów. Gdy formularz wyśle APPLICATION na webhook, pojawią się tutaj jako karty.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const required = parseRequiredTests(c.required_tests);
            const expected = Math.max(c.tests_expected || required.length, 0);
            const results = parseTestResults(c.test_results);
            const completed = Math.min(
              Math.max(c.tests_completed ?? Object.keys(results).length, 0),
              expected || Object.keys(results).length,
            );
            const pct = expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0;

            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="admin-card group flex h-full w-full flex-col items-stretch gap-3 p-4 text-left transition hover:border-[#000C4A]/35 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="dash-sans text-depths truncate text-base font-bold tracking-tight group-hover:underline">
                        {c.full_name}
                      </p>
                      <p className="dash-sans text-muted mt-0.5 truncate text-xs">{c.email}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide ${STATUS_BADGE[c.status]}`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {required.length === 0 ? (
                      <span className="text-muted text-[0.65rem]">Brak listy testów</span>
                    ) : (
                      required.map((t) => {
                        const score = results[t.subject]?.score;
                        return (
                          <span
                            key={`${t.subject}-${t.level}`}
                            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                              score
                                ? "bg-moss/15 text-moss"
                                : "bg-paper text-depths"
                            }`}
                          >
                            {t.subject}
                            {score ? ` ${score}` : t.level ? ` · ${t.level}` : ""}
                          </span>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="dash-sans text-muted text-[0.65rem] font-bold uppercase tracking-wide">
                        Testy
                      </p>
                      <p className="dash-mono text-depths text-xs font-bold tabular-nums">
                        {completed}/{expected || "—"}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
                      <div
                        className="h-full rounded-full bg-[#000C4A]/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-muted mt-2 text-[0.65rem]">
                      {c.test_sent_manually ? "Testy wysłane" : "Testy niewysłane"}
                      {c.tests_reviewed_manually ? " · sprawdzone" : ""}
                      {" · "}
                      kliknij profil
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? (
        <CandidateProfileModal
          candidate={selected}
          open
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            startTransition(() => router.refresh());
          }}
        />
      ) : null}
    </div>
  );
}
