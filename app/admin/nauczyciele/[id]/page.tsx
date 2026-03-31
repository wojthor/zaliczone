 "use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DEMO_FINANCE_LINES } from "@/lib/demo-data";
import { ADMIN_TUTORS } from "@/lib/admin-demo";

export default function TutorDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const tutor = ADMIN_TUTORS.find((t) => t.id === id);
  const [payoutDone, setPayoutDone] = useState(false);
  const [status, setStatus] = useState<string>(tutor?.status ?? "aktywny");
  const lessons = useMemo(
    () =>
      DEMO_FINANCE_LINES.filter((_, idx) => ADMIN_TUTORS[idx % ADMIN_TUTORS.length]?.id === id).map((row, idx) => ({
        ...row,
        paid: idx % 2 === 0,
      })),
    [id],
  );

  if (!tutor) return <p className="text-muted">Nie znaleziono nauczyciela.</p>;
  const unpaidLessons = lessons.filter((l) => !l.paid);
  const paidLessons = lessons.filter((l) => l.paid);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-depths text-2xl font-semibold tracking-tight">{tutor.name}</h1>
        <p className="text-muted mt-1 text-sm">{tutor.email} · {tutor.phone}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Kpi label="Uczniowie" value={String(tutor.students)} />
        <Kpi label="Lekcje (miesiąc)" value={String(tutor.lessonsDoneMonth)} />
        <Kpi label="Do wypłaty" value={`${tutor.pendingPln} zł`} danger />
        <Kpi label="Wypłacone" value={`${tutor.paidPln} zł`} ok />
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-depths font-semibold">Przedmioty i status</h2>
          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-full border border-panel-frame/35 bg-white px-3 py-1 text-xs font-semibold text-depths"
            >
              <option value="aktywny">Aktywny</option>
              <option value="nieaktywny">Nieaktywny</option>
              <option value="zablokowany">Zablokowany</option>
              <option value="zwolniony">Zwolniony</option>
            </select>
            <button
              type="button"
              onClick={() => setPayoutDone((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                payoutDone ? "bg-green-700 text-white" : "bg-[#000C4A] text-lime"
              }`}
            >
              {payoutDone ? "Wypłacone" : "Wypłata"}
            </button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tutor.subjects.map((s) => (
            <span key={s} className="rounded-full border border-panel-frame/35 bg-luster px-2.5 py-0.5 text-xs font-semibold">
              {s}
            </span>
          ))}
        </div>
        <p className="text-muted mt-3 text-xs">
          Numer konta: <span className="font-semibold text-depths">{tutor.bankAccount}</span>
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
          <h3 className="text-depths font-semibold">Niepłacone zajęcia</h3>
          <ul className="mt-2 space-y-1.5">
            {unpaidLessons.map((l) => (
              <li key={l.id} className="rounded-app bg-aster/10 px-3 py-2 text-sm">
                {l.studentName} · {l.label} · {l.date} · <span className="font-bold text-aster">{l.amountPln} zł</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
          <h3 className="text-depths font-semibold">Opłacone zajęcia</h3>
          <ul className="mt-2 space-y-1.5">
            {paidLessons.map((l) => (
              <li key={l.id} className="rounded-app bg-lime/20 px-3 py-2 text-sm">
                {l.studentName} · {l.label} · {l.date} · <span className="font-bold text-green-700">{l.amountPln} zł</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}

function Kpi({ label, value, ok, danger }: { label: string; value: string; ok?: boolean; danger?: boolean }) {
  return (
    <article className="rounded-app border border-panel-frame/35 bg-snow p-3.5">
      <p className="text-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${ok ? "text-green-700" : danger ? "text-red-700" : "text-depths"}`}>{value}</p>
    </article>
  );
}
