import Link from "next/link";
import { DEMO_FINANCE_LINES, DEMO_STUDENTS } from "@/lib/demo-data";
import {
  ADMIN_PENDING_SUBJECTS,
  ADMIN_STUDENT_MESSAGES,
  ADMIN_SYSTEM_ALERTS,
  ADMIN_TUTORS,
} from "@/lib/admin-demo";
import {
  IconBell,
  IconDashboard,
  IconFolder,
  IconPayroll,
  IconUsers,
  IconWallet,
} from "@/components/icons";

const TUTOR_SHARE = 0.7;

function currentMonthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthKeyFromLessonDateDdMm(dateLabel: string): string {
  const [, mm] = dateLabel.split(".");
  const y = new Date().getFullYear();
  return `${y}-${String(Number(mm ?? "1")).padStart(2, "0")}`;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL")} zł`;
}

function greetingLine(): string {
  const h = new Date().getHours();
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Witaj ponownie";
  return "Dobry wieczór";
}

export default function AdminHomePage() {
  const nowKey = currentMonthKey();
  const monthLabel = formatMonthLongPl(nowKey);
  const linesThisMonth = DEMO_FINANCE_LINES.filter((l) => monthKeyFromLessonDateDdMm(l.date) === nowKey);
  const monthRevenue = linesThisMonth.reduce((s, l) => s + l.amountPln, 0);
  const monthPayroll = Math.round(monthRevenue * TUTOR_SHARE);
  const monthNetAgency = monthRevenue - monthPayroll;

  const totalAllTime = DEMO_FINANCE_LINES.reduce((s, row) => s + row.amountPln, 0);
  const workedHours =
    Math.round((DEMO_FINANCE_LINES.reduce((s, row) => s + (row.label.includes("90 min") ? 90 : 60), 0) / 60) * 10) / 10;
  const studentsAssigned = ADMIN_TUTORS.reduce((s, t) => s + t.students, 0);
  const activeTutors = ADMIN_TUTORS.filter((t) => t.status === "aktywny").length;
  const lessonsThisMonth = linesThisMonth.length;

  const totalPending = ADMIN_TUTORS.reduce((s, t) => s + t.pendingPln, 0);
  const totalPaid = ADMIN_TUTORS.reduce((s, t) => s + t.paidPln, 0);
  const cashflowTotal = totalPending + totalPaid;
  const paidShare = cashflowTotal > 0 ? Math.round((totalPaid / cashflowTotal) * 100) : 0;

  const unreadSystem = ADMIN_SYSTEM_ALERTS.filter((a) => a.unread).length;
  const tutorsByLoad = [...ADMIN_TUTORS].sort((a, b) => b.lessonsDoneMonth - a.lessonsDoneMonth);

  const moduleTiles = [
    {
      href: "/admin/rozliczenia",
      title: "Rozliczenia",
      blurb: "Wpłaty od klientów, BLIK i przelewy.",
      Icon: IconWallet,
      accent: "from-[#000C4A]/12 to-transparent",
    },
    {
      href: "/admin/wyplaty",
      title: "Wypłaty",
      blurb: "Lista wypłat i bilans marży.",
      Icon: IconPayroll,
      accent: "from-emerald-600/10 to-transparent",
    },
    {
      href: "/admin/ksiegowosc",
      title: "Księgowość",
      blurb: "Ewidencja sprzedaży miesięczna.",
      Icon: IconWallet,
      accent: "from-slate-600/10 to-transparent",
    },
    {
      href: "/admin/nauczyciele",
      title: "Nauczyciele",
      blurb: `${activeTutors} aktywnych · zespół i godziny.`,
      Icon: IconUsers,
      accent: "from-[#000C4A]/12 to-transparent",
    },
    {
      href: "/admin/cennik",
      title: "Cennik",
      blurb: "Stawki i zgody na przedmioty.",
      Icon: IconWallet,
      accent: "from-amber-600/10 to-transparent",
    },
    {
      href: "/admin/powiadomienia",
      title: "Powiadomienia",
      blurb:
        unreadSystem > 0
          ? `${unreadSystem} nieprzeczytanego systemu.`
          : "Skrzynka i wysyłka do zespołu.",
      Icon: IconBell,
      accent: "from-rose-600/10 to-transparent",
    },
    {
      href: "/admin/dokumenty",
      title: "Dokumenty",
      blurb: "Ewidencje i teczki pracowników.",
      Icon: IconFolder,
      accent: "from-slate-500/12 to-transparent",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-app border border-panel-frame/40 bg-linear-to-br from-snow via-luster/80 to-snow p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-lime/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
              <IconDashboard className="size-3.5 shrink-0 text-[#000C4A]" />
              Panel operacyjny
            </p>
            <h1 className="text-depths mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {greetingLine()}
              <span className="text-depths/70 font-normal"> — podsumowanie placówki</span>
            </h1>
            <p className="text-muted mt-2 max-w-xl text-sm leading-relaxed">
              Bieżący okres: <strong className="text-depths font-semibold">{monthLabel}</strong>. Poniżej skróty do
              modułów, przepływy gotówki i szybki wgląd w zespół.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            <span className="rounded-app border border-panel-frame/30 bg-snow/90 px-3 py-1.5 text-center text-xs font-semibold text-depths shadow-sm">
              <span className="text-muted block text-[10px] uppercase tracking-wide">Lekcje w okreszie</span>
              {lessonsThisMonth}
            </span>
            <span className="rounded-app border border-panel-frame/30 bg-snow/90 px-3 py-1.5 text-center text-xs font-semibold text-depths shadow-sm">
              <span className="text-muted block text-[10px] uppercase tracking-wide">Przegląd</span>
              <Link href="/admin/rozliczenia" className="text-[#000C4A] underline-offset-2 hover:underline">
                Rozliczenia
              </Link>
            </span>
            <span className="rounded-app border border-panel-frame/30 bg-snow/90 px-3 py-1.5 text-center text-xs font-semibold text-depths shadow-sm">
              <span className="text-muted block text-[10px] uppercase tracking-wide">Uczniowie (demo)</span>
              <Link href="/uczniowie" className="text-[#000C4A] underline-offset-2 hover:underline">
                {DEMO_STUDENTS.length} profili
              </Link>
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiLink
          href="/admin/ksiegowosc"
          label={`Przychód · ${monthLabel.split(" ")[0]}`}
          value={formatPln(monthRevenue)}
          hint="Zsumowane wpłaty z demo za ten miesiąc"
          highlight="blue"
        />
        <KpiLink
          href="/admin/wyplaty"
          label="Koszty personelu (70%)"
          value={formatPln(monthPayroll)}
          hint="Szacunek wypłat — jak w module Wypłaty"
          highlight="amber"
        />
        <KpiLink
          href="/admin/wyplaty"
          label="Zysk agencji (30%)"
          value={formatPln(monthNetAgency)}
          hint="Marża po symulacji podziału"
          highlight="profit"
        />
        <KpiLink
          href="/admin/nauczyciele"
          label="Godziny (łącznie, demo)"
          value={`${workedHours} h`}
          hint={`${studentsAssigned} uczniów pod opieką · ${ADMIN_TUTORS.length} nauczycieli`}
          highlight="neutral"
        />
      </section>

      <section>
        <h2 className="text-depths mb-3 text-sm font-semibold tracking-tight">Moduły — szybki start</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {moduleTiles.map(({ href, title, blurb, Icon, accent }) => (
            <Link
              key={href}
              href={href}
              className={`group relative overflow-hidden rounded-app border border-panel-frame/35 bg-snow p-4 shadow-sm transition hover:border-[#000C4A]/25 hover:shadow-md`}
            >
        <div
          className={`pointer-events-none absolute inset-0 bg-linear-to-br ${accent} opacity-80`}
          aria-hidden
        />
              <div className="relative flex gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-app bg-[#000C4A]/8 text-[#000C4A] transition group-hover:bg-[#000C4A]/12">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-depths font-semibold leading-tight group-hover:text-[#000C4A]">{title}</p>
                  <p className="text-muted mt-1 text-xs leading-snug">{blurb}</p>
                  <p className="text-depths/50 mt-2 text-[11px] font-bold uppercase tracking-wide opacity-0 transition group-hover:opacity-100">
                    Otwórz →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-app border border-panel-frame/35 bg-luster/50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-depths font-semibold">Przepływ rozliczeń</h2>
              <p className="text-muted text-xs">Wpłaty z podsumowań zespołu — spójne z kartą nauczyciela.</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/rozliczenia"
                className="rounded-app border border-panel-frame/40 bg-snow px-3 py-1.5 text-xs font-bold text-[#000C4A] transition hover:bg-snow"
              >
                Rozliczenia
              </Link>
              <Link
                href="/admin/wyplaty"
                className="rounded-app border border-emerald-600/25 bg-snow px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50/80"
              >
                Wypłaty
              </Link>
            </div>
          </div>

          <div className="mb-4 h-3 overflow-hidden rounded-full bg-snow">
            <div
              className="h-full rounded-full bg-linear-to-r from-green-600 to-lime transition-all"
              style={{ width: `${paidShare}%` }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-app border border-amber-500/20 bg-snow px-4 py-3">
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">Oczekujące wpłaty</p>
              <p className="text-aster mt-1 text-2xl font-black tabular-nums">{formatPln(totalPending)}</p>
              <p className="text-muted mt-1 text-[11px]">{100 - paidShare}% salda wg demo</p>
            </div>
            <div className="rounded-app border border-green-700/15 bg-snow px-4 py-3">
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">Już opłacone</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-green-800">{formatPln(totalPaid)}</p>
              <p className="text-muted mt-1 text-[11px]">{paidShare}% zaksięgowane</p>
            </div>
          </div>
          <p className="text-muted mt-3 text-xs">
            Łączny obrót pozycji finansowych (demo): <strong className="text-depths">{formatPln(totalAllTime)}</strong>
          </p>
        </section>

        <section className="rounded-app border border-panel-frame/35 bg-luster/50 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-depths font-semibold">Zespół pod obciążeniem</h2>
            <Link href="/admin/nauczyciele" className="text-xs font-bold text-[#000C4A]">
              Cała lista →
            </Link>
          </div>
          <ul className="space-y-2">
            {tutorsByLoad.map((t, i) => (
              <li key={t.id}>
                <Link
                  href={`/admin/nauczyciele/${t.id}`}
                  className="flex items-center gap-3 rounded-app border border-transparent bg-snow px-3 py-2.5 transition hover:border-panel-frame/40 hover:shadow-sm"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-app bg-[#000C4A]/8 text-xs font-black text-[#000C4A]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-depths">{t.name}</p>
                    <p className="text-muted text-[11px]">
                      {t.lessonsDoneMonth} lekcji w zestawieniu · {t.students} uczniów
                    </p>
                  </div>
                  <span
                    className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase sm:inline ${
                      t.status === "aktywny"
                        ? "bg-lime/25 text-depths"
                        : t.status === "wstrzymany"
                          ? "bg-amber-500/15 text-amber-800"
                          : "bg-steel/15 text-muted"
                    }`}
                  >
                    {t.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-app border border-panel-frame/35 bg-luster/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-depths font-semibold">Wiadomości od uczniów</h2>
            <Link href="/admin/powiadomienia" className="text-xs font-bold text-[#000C4A]">
              Skrzynka →
            </Link>
          </div>
          <ul className="space-y-2">
            {ADMIN_STUDENT_MESSAGES.map((m) => (
              <li key={m.id} className="rounded-app border border-panel-frame/25 bg-snow px-3 py-2 text-sm">
                <p className="font-semibold text-depths">
                  {m.studentName} · {m.subject}
                </p>
                <p className="text-muted text-xs">{m.date}</p>
                <p className="text-depths/85 mt-0.5 line-clamp-2">{m.preview}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-app border border-panel-frame/35 bg-luster/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-depths font-semibold">Wymagają akcji</h2>
            <Link href="/admin/cennik" className="text-xs font-bold text-[#000C4A]">
              Cennik →
            </Link>
          </div>
          <ul className="space-y-2">
            {ADMIN_PENDING_SUBJECTS.map((p) => (
              <li
                key={p.id}
                className="flex items-start gap-2 rounded-app border border-amber-500/20 bg-snow px-3 py-2 text-sm"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <div>
                  <span className="font-semibold text-depths">{p.tutorName}</span>
                  <span className="text-muted"> · {p.subject}</span>
                  <span className="text-muted text-xs"> · {p.level}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function KpiLink({
  href,
  label,
  value,
  hint,
  highlight,
}: {
  href: string;
  label: string;
  value: string;
  hint: string;
  highlight: "blue" | "amber" | "profit" | "neutral";
}) {
  const ring =
    highlight === "profit"
      ? "hover:border-emerald-600/35 hover:shadow-emerald-900/5"
      : highlight === "amber"
        ? "hover:border-amber-500/35"
        : highlight === "blue"
          ? "hover:border-[#000C4A]/30"
          : "hover:border-panel-frame/50";

  const valueClass =
    highlight === "profit"
      ? "text-green-800"
      : highlight === "amber"
        ? "text-amber-800"
        : highlight === "blue"
          ? "text-[#000C4A]"
          : "text-depths";

  return (
    <Link
      href={href}
      className={`group block rounded-app border border-panel-frame/35 bg-snow p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${ring}`}
    >
      <p className="text-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums transition group-hover:scale-[1.02] ${valueClass}`}>{value}</p>
      <p className="text-muted mt-2 text-[11px] leading-snug">{hint}</p>
      <p className="text-depths/45 mt-2 text-[10px] font-bold uppercase tracking-wide group-hover:text-[#000C4A]/70">
        Szczegóły →
      </p>
    </Link>
  );
}
