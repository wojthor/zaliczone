"use client";

import Link from "next/link";
import { BonusProgressBar } from "@/components/bonus-progress-bar";
import { bonusProgress } from "@/lib/dates";
import type { AdminTutorSummary } from "@/lib/types/database";

export function PremieClient({ tutors }: { tutors: AdminTutorSummary[] }) {
  const sorted = [...tutors].sort((a, b) => b.hoursDoneMonth - a.hoursDoneMonth);
  const near = sorted.filter((t) => {
    const p = bonusProgress(t.hoursDoneMonth);
    return !p.achieved && p.ratio >= 0.75;
  }).length;
  const done = sorted.filter((t) => bonusProgress(t.hoursDoneMonth).achieved).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight">Premie</h1>
        <p className="dash-sans text-muted mt-1 text-sm">
          Postęp do premii w tym miesiącu (zatwierdzone godziny). Próg i kwota są w ustawieniach
          terminów.
        </p>
      </div>
      <p className="text-sm text-depths">
        <strong>{done}</strong> na progu · <strong>{near}</strong> blisko (75%+)
      </p>
      <ul className="space-y-2">
        {sorted.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 rounded-app border border-panel-frame/40 bg-snow p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-depths">{t.name}</p>
              <p className="text-muted text-xs">
                {t.hoursDoneMonth} godz. · {t.lessonsDoneMonth} lekcji
              </p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:max-w-sm sm:justify-end">
              <BonusProgressBar hoursDone={t.hoursDoneMonth} minimal className="w-full" />
              <Link
                href={`/admin/nauczyciele/${t.id}`}
                className="shrink-0 text-xs font-semibold text-[#000C4A] underline"
              >
                Profil
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
