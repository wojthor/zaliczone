"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  CANDIDATE_TEST_WORKFLOW_LABEL,
  CANDIDATE_TEST_WORKFLOW_ORDER,
  findResultForRequired,
  getCandidateTestProgress,
  getCandidateTestWorkflow,
  highestRequiredTests,
  isFailingScore,
  parseTestResultsList,
  type CandidateTestWorkflow,
  type RequiredTest,
  type TestResultEntry,
} from "@/lib/recruitment/test-links";
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

type ViewFilter = "PIPELINE" | "SHORTLIST" | CandidateTestWorkflow | "HIRED" | "REJECTED";

type SortMode =
  | "newest"
  | "oldest"
  | "az"
  | "za"
  | "studentYes"
  | "studentNo";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Najnowsi" },
  { value: "oldest", label: "Najstarsi" },
  { value: "az", label: "Imię A–Z" },
  { value: "za", label: "Imię Z–A" },
  { value: "studentYes", label: "Status studenta: Tak najpierw" },
  { value: "studentNo", label: "Status studenta: Nie najpierw" },
];

const WORKFLOW_META: Record<
  CandidateTestWorkflow,
  { hint: string; section: string; badge: string; dot: string }
> = {
  NOT_SENT: {
    hint: "Wyślij testy i zaznacz w profilu",
    section: "border-l-[#000C4A] bg-[#000C4A]/[0.03]",
    badge: "bg-[#000C4A]/10 text-depths",
    dot: "bg-[#000C4A]",
  },
  IN_PROGRESS: {
    hint: "Czekamy na wyniki z Forms",
    section: "border-l-toffee bg-toffee/[0.06]",
    badge: "bg-toffee/20 text-toffee",
    dot: "bg-toffee",
  },
  DONE: {
    hint: "Wszystkie testy oddane — można decydować",
    section: "border-l-moss bg-moss/[0.06]",
    badge: "bg-moss/15 text-moss",
    dot: "bg-moss",
  },
  OVERDUE: {
    hint: "Termin minął — brakuje wyników",
    section: "border-l-claret bg-claret/[0.05]",
    badge: "bg-claret/15 text-claret",
    dot: "bg-claret",
  },
};

const FILTER_PILLS: { key: ViewFilter; label: string }[] = [
  { key: "PIPELINE", label: "Aktywni" },
  { key: "SHORTLIST", label: "Rekrutacja" },
  ...CANDIDATE_TEST_WORKFLOW_ORDER.map((key) => ({
    key,
    label: CANDIDATE_TEST_WORKFLOW_LABEL[key],
  })),
  { key: "HIRED", label: "Zatrudnieni" },
  { key: "REJECTED", label: "Odrzuceni" },
];

function isOpenCandidate(c: Candidate): boolean {
  return c.status === "NEW" || c.status === "IN_PROGRESS";
}

function sortCandidates(list: Candidate[], mode: SortMode): Candidate[] {
  const next = [...list];
  next.sort((a, b) => {
    if (mode === "newest") return b.created_at.localeCompare(a.created_at);
    if (mode === "oldest") return a.created_at.localeCompare(b.created_at);
    if (mode === "az") return a.full_name.localeCompare(b.full_name, "pl");
    if (mode === "za") return b.full_name.localeCompare(a.full_name, "pl");
    if (mode === "studentYes") {
      const byStatus = Number(b.student_status) - Number(a.student_status);
      return byStatus !== 0 ? byStatus : a.full_name.localeCompare(b.full_name, "pl");
    }
    const byStatus = Number(a.student_status) - Number(b.student_status);
    return byStatus !== 0 ? byStatus : a.full_name.localeCompare(b.full_name, "pl");
  });
  return next;
}

export function RekrutacjaClient({ initialCandidates }: { initialCandidates: Candidate[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ViewFilter>("PIPELINE");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const openCandidates = useMemo(
    () => sortCandidates(initialCandidates.filter(isOpenCandidate), sortMode),
    [initialCandidates, sortMode],
  );

  const shortlistCandidates = useMemo(
    () =>
      sortCandidates(
        initialCandidates.filter((c) => !c.student_status),
        sortMode,
      ),
    [initialCandidates, sortMode],
  );

  const grouped = useMemo(() => {
    const map: Record<CandidateTestWorkflow, Candidate[]> = {
      NOT_SENT: [],
      IN_PROGRESS: [],
      DONE: [],
      OVERDUE: [],
    };
    for (const c of openCandidates) {
      const bucket = getCandidateTestWorkflow(c);
      if (bucket) map[bucket].push(c);
    }
    return map;
  }, [openCandidates]);

  const closedRows = useMemo(() => {
    if (filter === "HIRED") {
      return sortCandidates(
        initialCandidates.filter((c) => c.status === "HIRED"),
        sortMode,
      );
    }
    if (filter === "REJECTED") {
      return sortCandidates(
        initialCandidates.filter((c) => c.status === "REJECTED"),
        sortMode,
      );
    }
    return [];
  }, [filter, initialCandidates, sortMode]);

  const selected = useMemo(
    () => initialCandidates.find((c) => c.id === selectedId) ?? null,
    [initialCandidates, selectedId],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      PIPELINE: openCandidates.length,
      SHORTLIST: shortlistCandidates.length,
      HIRED: initialCandidates.filter((c) => c.status === "HIRED").length,
      REJECTED: initialCandidates.filter((c) => c.status === "REJECTED").length,
    };
    for (const key of CANDIDATE_TEST_WORKFLOW_ORDER) {
      map[key] = grouped[key].length;
    }
    return map;
  }, [grouped, initialCandidates, openCandidates.length, shortlistCandidates.length]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight sm:text-3xl">
            Rekrutacja
          </h1>
          <span className="mt-1.5 block h-1 w-10 rounded-full bg-lime" aria-hidden />
          <p className="dash-sans text-muted mt-1.5 text-sm">
            Formularz → testy → wyniki z Forms → decyzja
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-muted text-[10px] font-bold uppercase tracking-[0.12em]">
              Sortowanie
            </span>
            <select
              className="dash-sans text-depths rounded-full border border-panel-frame/40 bg-snow px-3 py-1.5 text-[0.7rem] font-bold"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sortowanie kandydatów"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <p className="dash-mono text-muted text-xs font-semibold tabular-nums">
            {initialCandidates.length} osób · {openCandidates.length} aktywnych
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_PILLS.map(({ key, label }) => {
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

      {filter === "PIPELINE" ? (
        openCandidates.length === 0 ? (
          <EmptyState message="Brak aktywnych kandydatów." />
        ) : (
          <div className="space-y-8">
            {CANDIDATE_TEST_WORKFLOW_ORDER.map((bucket) => (
              <WorkflowSection
                key={bucket}
                bucket={bucket}
                candidates={grouped[bucket]}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )
      ) : filter === "SHORTLIST" ? (
        shortlistCandidates.length === 0 ? (
          <EmptyState message="Brak osób ze statusem studenta „Nie”." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shortlistCandidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} onSelect={setSelectedId} />
            ))}
          </ul>
        )
      ) : filter === "HIRED" || filter === "REJECTED" ? (
        closedRows.length === 0 ? (
          <EmptyState message={`Brak kandydatów — ${STATUS_LABEL[filter].toLowerCase()}.`} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {closedRows.map((c) => (
              <CandidateCard key={c.id} candidate={c} onSelect={setSelectedId} />
            ))}
          </ul>
        )
      ) : grouped[filter].length === 0 ? (
        <EmptyState message={`Brak w grupie „${CANDIDATE_TEST_WORKFLOW_LABEL[filter]}”.`} />
      ) : (
        <WorkflowSection bucket={filter} candidates={grouped[filter]} onSelect={setSelectedId} />
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

function EmptyState({ message }: { message: string }) {
  return (
    <p className="dash-sans text-muted soft-panel px-4 py-10 text-center text-sm">{message}</p>
  );
}

function WorkflowSection({
  bucket,
  candidates,
  onSelect,
}: {
  bucket: CandidateTestWorkflow;
  candidates: Candidate[];
  onSelect: (id: string) => void;
}) {
  if (candidates.length === 0) return null;

  const meta = WORKFLOW_META[bucket];

  return (
    <section
      className={`overflow-hidden rounded-app border border-panel-frame/25 border-l-4 ${meta.section}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-panel-frame/20 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`size-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden />
          <div>
            <h2 className="dash-sans text-depths text-sm font-bold tracking-tight">
              {CANDIDATE_TEST_WORKFLOW_LABEL[bucket]}
            </h2>
            <p className="text-muted text-[0.7rem] leading-snug">{meta.hint}</p>
          </div>
        </div>
        <span
          className={`dash-mono shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold tabular-nums ${meta.badge}`}
        >
          {candidates.length}
        </span>
      </header>

      <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} workflow={bucket} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}

function CandidateCard({
  candidate: c,
  workflow,
  onSelect,
}: {
  candidate: Candidate;
  workflow?: CandidateTestWorkflow;
  onSelect: (id: string) => void;
}) {
  const { required, expected, completed } = getCandidateTestProgress(c);
  const results = parseTestResultsList(c.test_results);
  const pct = expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0;
  const bucket = workflow ?? getCandidateTestWorkflow(c);
  const workflowBadge = bucket ? WORKFLOW_META[bucket].badge : null;
  const closed = c.status === "HIRED" || c.status === "REJECTED";

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(c.id)}
        className="admin-card group flex h-full w-full flex-col items-stretch gap-3 p-4 text-left transition hover:border-[#000C4A]/35 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="dash-sans text-depths truncate text-base font-bold tracking-tight group-hover:underline">
              {c.full_name}
            </p>
            <p className="dash-sans text-muted mt-0.5 truncate text-xs">{c.email}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {workflowBadge && !closed ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wide ${workflowBadge}`}
              >
                {CANDIDATE_TEST_WORKFLOW_LABEL[bucket!]}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide ${STATUS_BADGE[c.status]}`}
            >
              {STATUS_LABEL[c.status]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wide ${
                c.student_status ? "bg-moss/15 text-moss" : "bg-claret/10 text-claret"
              }`}
            >
              Student: {c.student_status ? "Tak" : "Nie"}
            </span>
          </div>
        </div>

        <SubjectChips required={highestRequiredTests(required)} results={results} />

        <TestProgressFooter completed={completed} expected={expected} pct={pct} workflow={bucket} />
      </button>
    </li>
  );
}

function SubjectChips({
  required,
  results,
}: {
  required: RequiredTest[];
  results: TestResultEntry[];
}) {
  if (required.length === 0) {
    return <span className="text-muted text-[0.65rem]">Brak listy testów</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {required.map((t) => {
        const hit = findResultForRequired(results, t);
        const score = hit?.score ?? null;
        const failed = score ? isFailingScore(score) : false;
        return (
          <span
            key={t.subject}
            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
              !score
                ? "bg-paper text-depths"
                : failed
                  ? "bg-claret/15 text-claret"
                  : "bg-moss/15 text-moss"
            }`}
          >
            {t.subject}
            {score ? ` ${score}` : ""}
          </span>
        );
      })}
    </div>
  );
}

function TestProgressFooter({
  completed,
  expected,
  pct,
  workflow,
}: {
  completed: number;
  expected: number;
  pct: number;
  workflow: CandidateTestWorkflow | null;
}) {
  let note: ReactNode = "Kliknij profil";
  if (workflow === "NOT_SENT") note = "Do wysłania testów";
  else if (workflow === "IN_PROGRESS") note = `${completed}/${expected || "—"} · w trakcie`;
  else if (workflow === "OVERDUE") note = `${completed}/${expected || "—"} · po terminie`;
  else if (workflow === "DONE") note = "Wszystkie testy oddane";

  return (
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
          className={`h-full rounded-full transition-all ${
            workflow === "DONE"
              ? "bg-moss"
              : workflow === "OVERDUE"
                ? "bg-claret"
                : "bg-[#000C4A]/80"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-muted mt-2 text-[0.65rem]">{note}</p>
    </div>
  );
}
