"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRejectLessonPayment, adminVerifyLesson } from "@/lib/actions/admin";
import { formatDateDdMm } from "@/lib/data/mappers";
import type { FinanceLineUi } from "@/lib/types/database";
import { isIsoDateInWeek, dateLabelToIsoKey } from "@/lib/date/week-utils";
import { WeekNavigator, useWeekMondayIso } from "@/components/week-navigator";
import { Spinner, useToast } from "@/components/ui/toast";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ensureDateIso(line: FinanceLineUi): FinanceLineUi {
  return {
    ...line,
    dateIso: line.dateIso || dateLabelToIsoKey(line.date),
  };
}

export function RozliczeniaClient({
  pendingLines,
  verifiedLines,
  unpaidLines,
}: {
  pendingLines: FinanceLineUi[];
  verifiedLines: FinanceLineUi[];
  unpaidLines: FinanceLineUi[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState<FinanceLineUi[]>(() => pendingLines.map(ensureDateIso));
  const [verified, setVerified] = useState<FinanceLineUi[]>(() => verifiedLines.map(ensureDateIso));
  const [unpaid, setUnpaid] = useState<FinanceLineUi[]>(() => unpaidLines.map(ensureDateIso));
  const [query, setQuery] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [weekMondayIso, setWeekMondayIso] = useWeekMondayIso(-1);
  const [paymentDates, setPaymentDates] = useState<Record<string, string>>({});

  useEffect(() => {
    setPending(pendingLines.map(ensureDateIso));
    setVerified(verifiedLines.map(ensureDateIso));
    setUnpaid(unpaidLines.map(ensureDateIso));
  }, [pendingLines, verifiedLines, unpaidLines]);

  useEffect(() => {
    setPaymentDates((prev) => {
      const next = { ...prev };
      for (const row of [...pending, ...unpaid]) {
        if (!next[row.id]) next[row.id] = todayIso();
      }
      for (const row of verified) {
        if (row.paymentReceivedAtIso) next[row.id] = row.paymentReceivedAtIso;
      }
      return next;
    });
  }, [pending, unpaid, verified]);

  const queryNorm = query.trim().toLowerCase();
  const matchesQuery = (r: FinanceLineUi) => {
    if (!queryNorm) return true;
    return [
      r.tutorName,
      r.subject,
      r.date,
      r.paymentReceivedAt ?? "",
      r.studentName,
      String(r.amountPln),
      r.status,
      r.label,
    ]
      .join(" ")
      .toLowerCase()
      .includes(queryNorm);
  };

  const inSelectedWeek = (r: FinanceLineUi) => isIsoDateInWeek(r.dateIso, weekMondayIso);

  const pendingInWeek = pending.filter((r) => matchesQuery(r) && inSelectedWeek(r));
  const verifiedInWeek = verified.filter((r) => matchesQuery(r) && inSelectedWeek(r));
  const unpaidInWeek = unpaid.filter((r) => matchesQuery(r) && inSelectedWeek(r));

  const pendingWeekAll = pending.filter(inSelectedWeek).length;
  const verifiedWeekAll = verified.filter(inSelectedWeek).length;
  const unpaidWeekAll = unpaid.filter(inSelectedWeek).length;
  const weekTotalAll = pendingWeekAll + verifiedWeekAll + unpaidWeekAll;

  const pendingByDay = groupByDayDesc(pendingInWeek);
  const verifiedByDay = groupByDayDesc(verifiedInWeek);
  const unpaidByDay = groupByDayDesc(unpaidInWeek);

  function paymentIsoFor(id: string): string {
    return paymentDates[id] ?? todayIso();
  }

  function applyVerifiedPayment(row: FinanceLineUi, paidIso: string): FinanceLineUi {
    return {
      ...row,
      status: "VERIFIED",
      paymentReceivedAt: formatDateDdMm(paidIso),
      paymentReceivedAtIso: paidIso,
    };
  }

  async function markVerified(id: string) {
    if (movingId) return;
    const paidIso = paymentIsoFor(id);
    setMovingId(id);
    try {
      await adminVerifyLesson(id, paidIso);
      const row = pending.find((x) => x.id === id);
      if (row) {
        setPending((prev) => prev.filter((x) => x.id !== id));
        setVerified((prev) => [applyVerifiedPayment(row, paidIso), ...prev]);
      }
      toast.success("Zatwierdzono", `Wpłata z datą ${formatDateDdMm(paidIso)}.`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się zatwierdzić lekcji.";
      toast.error("Błąd zatwierdzenia", msg);
    } finally {
      setMovingId(null);
    }
  }

  async function markUnpaid(id: string) {
    if (movingId) return;
    setMovingId(id);
    try {
      await adminRejectLessonPayment(id);
      const row = pending.find((x) => x.id === id);
      if (row) {
        setPending((prev) => prev.filter((x) => x.id !== id));
        setUnpaid((prev) => [
          { ...row, status: "UNPAID", paymentReceivedAt: null, paymentReceivedAtIso: null },
          ...prev,
        ]);
      }
      toast.success("Oznaczono jako nieopłacone", "Lekcja przeniesiona do listy nieopłaconych.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się oznaczyć jako nieopłacone.";
      toast.error("Błąd", msg);
    } finally {
      setMovingId(null);
    }
  }

  async function markVerifiedFromUnpaid(id: string) {
    if (movingId) return;
    const paidIso = paymentIsoFor(id);
    setMovingId(id);
    try {
      await adminVerifyLesson(id, paidIso);
      const row = unpaid.find((x) => x.id === id);
      if (row) {
        setUnpaid((prev) => prev.filter((x) => x.id !== id));
        setVerified((prev) => [applyVerifiedPayment(row, paidIso), ...prev]);
      }
      toast.success("Zatwierdzono ponownie", `Wpłata z datą ${formatDateDdMm(paidIso)}.`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nie udało się zatwierdzić lekcji.";
      toast.error("Błąd zatwierdzenia", msg);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="flex h-auto min-h-0 min-w-0 flex-col gap-3 overflow-visible sm:gap-4 lg:h-full lg:overflow-hidden">
      <div className="min-w-0 shrink-0 space-y-2">
        <h1 className="text-depths text-lg font-semibold tracking-tight sm:text-xl">Rozliczenia</h1>
        <p className="text-muted text-[0.7rem] leading-snug sm:text-xs">
          Przy zatwierdzeniu wpisz <strong>datę wpływu</strong> z wyciągu bankowego — po zatwierdzeniu nie da się jej
          zmienić.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <WeekVerificationBar
            total={weekTotalAll}
            pending={pendingWeekAll}
            verified={verifiedWeekAll}
            unpaid={unpaidWeekAll}
          />
          <WeekNavigator
            className="min-w-0 flex-1 justify-center px-0 py-0"
            weekMondayIso={weekMondayIso}
            onWeekMondayIsoChange={setWeekMondayIso}
            compact
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj…"
            className="w-full shrink-0 rounded-app border border-panel-frame/40 bg-white px-2.5 py-1.5 text-xs text-depths placeholder:text-muted sm:w-56"
          />
        </div>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-3 lg:overflow-hidden">
        <PaymentsPanel
          title="Do zatwierdzenia"
          subtitle="PENDING_VERIFICATION — sprawdź przelew i ustaw datę wpływu."
          empty="Brak lekcji do weryfikacji w wybranym tygodniu."
          groups={pendingByDay}
          variant="pending"
          count={pendingInWeek.length}
          movingId={movingId}
          paymentDates={paymentDates}
          onPaymentDateChange={(id, iso) => setPaymentDates((prev) => ({ ...prev, [id]: iso }))}
          onVerify={markVerified}
          onReject={markUnpaid}
        />

        <PaymentsPanel
          title="Zatwierdzone"
          subtitle="VERIFIED — data wpływu zablokowana · idą do wypłat / księgowości."
          empty="Brak zatwierdzonych pozycji w wybranym tygodniu."
          groups={verifiedByDay}
          variant="verified"
          count={verifiedInWeek.length}
          movingId={movingId}
          paymentDates={paymentDates}
          onPaymentDateChange={(id, iso) => setPaymentDates((prev) => ({ ...prev, [id]: iso }))}
        />

        <PaymentsPanel
          title="Nieopłacone"
          subtitle="UNPAID — po wpływie ustaw datę i zatwierdź ponownie."
          empty="Brak nieopłaconych lekcji w wybranym tygodniu."
          groups={unpaidByDay}
          variant="unpaid"
          count={unpaidInWeek.length}
          movingId={movingId}
          paymentDates={paymentDates}
          onPaymentDateChange={(id, iso) => setPaymentDates((prev) => ({ ...prev, [id]: iso }))}
          onVerify={markVerifiedFromUnpaid}
        />
      </div>
    </div>
  );
}

function WeekVerificationBar({
  total,
  pending,
  verified,
  unpaid,
}: {
  total: number;
  pending: number;
  verified: number;
  unpaid: number;
}) {
  const done = verified + unpaid;
  const donePct = total > 0 ? (done / total) * 100 : 0;
  const verifiedDeg = total > 0 ? (verified / total) * 360 : 0;
  const unpaidDeg = total > 0 ? (unpaid / total) * 360 : 0;
  const pendingDeg = total > 0 ? (pending / total) * 360 : 0;

  const pieBackground =
    total === 0
      ? "conic-gradient(#e8edf5 0deg 360deg)"
      : `conic-gradient(
          #15803d 0deg ${verifiedDeg}deg,
          #dc2626 ${verifiedDeg}deg ${verifiedDeg + unpaidDeg}deg,
          #f59e0b ${verifiedDeg + unpaidDeg}deg ${verifiedDeg + unpaidDeg + pendingDeg}deg
        )`;

  return (
    <div className="flex w-[14rem] shrink-0 items-center gap-2 sm:w-[16rem]">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-luster"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total || 100}
          aria-valuenow={done}
          aria-label={`Zweryfikowano ${done} z ${total} lekcji`}
        >
          <div
            className="h-full rounded-full bg-[#000C4A] transition-[width] duration-300 ease-out"
            style={{ width: `${donePct}%` }}
          />
        </div>
        <p className="text-muted text-[0.55rem] tabular-nums leading-none">
          {total === 0 ? "Brak lekcji" : `${done}/${total} zweryfikowane`}
        </p>
      </div>

      <div
        className="relative size-7 shrink-0 rounded-full"
        style={{ background: pieBackground }}
        title={`Zatwierdzone ${verified} · Nieopłacone ${unpaid} · Niezweryfikowane ${pending}`}
        aria-label={`Zatwierdzone ${verified}, nieopłacone ${unpaid}, niezweryfikowane ${pending} z ${total}`}
      >
        <div className="absolute inset-[3px] rounded-full bg-snow" />
        <span className="text-depths absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold tabular-nums">
          {total}
        </span>
      </div>
    </div>
  );
}

function PaymentsPanel({
  title,
  subtitle,
  empty,
  groups,
  variant,
  count,
  movingId,
  paymentDates,
  onPaymentDateChange,
  onVerify,
  onReject,
}: {
  title: string;
  subtitle: string;
  empty: string;
  groups: [string, FinanceLineUi[]][];
  variant: "pending" | "verified" | "unpaid";
  count: number;
  movingId: string | null;
  paymentDates: Record<string, string>;
  onPaymentDateChange: (id: string, iso: string) => void;
  onVerify?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const accent =
    variant === "pending"
      ? "border-aster/40"
      : variant === "verified"
        ? "border-green-600/30"
        : "border-red-400/40";

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-app border bg-snow ${accent} p-3 sm:p-4 max-h-[min(22rem,55dvh)] lg:max-h-none lg:h-full`}
    >
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-depths text-sm font-semibold sm:text-base">{title}</h2>
          <p className="text-muted mt-0.5 text-[0.65rem] leading-tight sm:text-xs">{subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#000C4A] px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-lime">
          {count}
        </span>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted py-6 text-center text-xs">{empty}</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-panel pr-0.5">
          {groups.map(([dayLabelText, dayRows]) => (
            <div key={dayLabelText} className="min-w-0">
              <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-wide text-muted">{dayLabelText}</p>
              <ul className="space-y-1.5">
                {dayRows.map((r) => (
                  <LessonRow
                    key={r.id}
                    row={r}
                    variant={variant}
                    busy={movingId === r.id}
                    disabled={movingId !== null}
                    paymentDate={paymentDates[r.id] ?? todayIso()}
                    onPaymentDateChange={(iso) => onPaymentDateChange(r.id, iso)}
                    onVerify={onVerify ? () => onVerify(r.id) : undefined}
                    onReject={onReject ? () => onReject(r.id) : undefined}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LessonRow({
  row,
  variant,
  busy,
  disabled,
  paymentDate,
  onPaymentDateChange,
  onVerify,
  onReject,
}: {
  row: FinanceLineUi;
  variant: "pending" | "verified" | "unpaid";
  busy: boolean;
  disabled: boolean;
  paymentDate: string;
  onPaymentDateChange: (iso: string) => void;
  onVerify?: () => void;
  onReject?: () => void;
}) {
  const amountClass =
    variant === "verified" ? "text-green-700" : variant === "unpaid" ? "text-red-700" : "text-aster";

  return (
    <li
      className={`rounded-app border border-panel-frame/30 bg-white px-2.5 py-2 sm:px-3 sm:py-2.5 ${
        variant === "unpaid" ? "border-red-300/40 bg-red-50/60" : ""
      } ${busy ? "opacity-80" : ""}`}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="text-depths truncate text-xs font-semibold sm:text-sm">{row.studentName}</p>
          <p className="text-muted mt-0.5 truncate text-[0.65rem] sm:text-xs">
            {row.tutorName} · {row.subject} · <span className="tabular-nums">{row.date}</span>
          </p>
        </div>
        <p className={`shrink-0 text-xs font-bold tabular-nums sm:text-sm ${amountClass}`}>{row.amountPln} zł</p>
      </div>

      <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <label className="min-w-0 flex-1">
          <span className="text-muted mb-0.5 block text-[0.55rem] font-bold uppercase tracking-wide">Data wpływu</span>
          {variant === "verified" ? (
            <span className="text-depths inline-block text-xs font-semibold tabular-nums">
              {row.paymentReceivedAt ?? "—"}
            </span>
          ) : (
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => onPaymentDateChange(e.target.value)}
              disabled={disabled}
              className="text-depths w-full min-w-0 max-w-[11rem] rounded-app border border-panel-frame/40 bg-white px-1.5 py-1 text-xs tabular-nums disabled:opacity-60"
              aria-label={`Data wpływu — ${row.studentName}`}
            />
          )}
        </label>

        {variant === "pending" ? (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={onVerify}
              disabled={disabled}
              className="inline-flex min-w-[5.5rem] items-center justify-center gap-1 rounded-app bg-green-700 px-2 py-1.5 text-[0.65rem] font-bold text-white disabled:opacity-60 sm:text-xs"
            >
              {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
              Zatwierdź
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={disabled}
              className="inline-flex min-w-[5.5rem] items-center justify-center gap-1 rounded-app bg-red-700 px-2 py-1.5 text-[0.65rem] font-bold text-white disabled:opacity-60 sm:text-xs"
            >
              {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
              Brak wpłaty
            </button>
          </div>
        ) : null}

        {variant === "unpaid" ? (
          <button
            type="button"
            onClick={onVerify}
            disabled={disabled}
            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-app bg-green-700 px-2.5 py-1.5 text-[0.65rem] font-bold text-white disabled:opacity-60 sm:text-xs"
          >
            {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
            Zatwierdź ponownie
          </button>
        ) : null}
      </div>
    </li>
  );
}

function groupByDayDesc(rows: FinanceLineUi[]): [string, FinanceLineUi[]][] {
  const map = new Map<string, FinanceLineUi[]>();
  for (const r of rows) {
    const k = r.dateIso;
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([k, list]) => [dayKeyToLabel(k), list] as [string, FinanceLineUi[]]);
}

function dayKeyToLabel(dayKey: string): string {
  const [y, mo, da] = dayKey.split("-").map(Number);
  const date = new Date(y ?? 0, (mo ?? 1) - 1, da ?? 1, 12, 0, 0, 0);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
