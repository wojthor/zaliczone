"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { blockStudentFromAlert, dismissAlert } from "@/lib/actions/alerts";
import type { AppAlert } from "@/lib/types/database";

export function AlertsBanner({
  alerts,
  role,
}: {
  alerts: AppAlert[];
  role: "ADMIN" | "TUTOR";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (alerts.length === 0) return null;

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-2" aria-live="polite">
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className="rounded-2xl border border-[#E23B3B]/25 bg-[#E23B3B]/8 px-4 py-3 text-depths"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#E23B3B]">Alert</p>
          <h3 className="mt-1 text-sm font-extrabold tracking-tight">{alert.title}</h3>
          <p className="text-muted mt-1 text-xs leading-relaxed">{alert.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {role === "ADMIN" && alert.kind === "UNPAID_STREAK" && alert.studentId ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => blockStudentFromAlert(alert.studentId!))}
                className="rounded-full bg-[#E23B3B] px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                Zablokuj ucznia
              </button>
            ) : null}
            {role === "ADMIN" && alert.kind === "STOP_TEACHING" && alert.tutorId ? (
              <Link
                href={`/admin/nauczyciele/${alert.tutorId}`}
                className="rounded-full bg-[#000C4A] px-3.5 py-1.5 text-xs font-semibold text-lime"
              >
                Profil nauczyciela
              </Link>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => dismissAlert(alert.id))}
              className="rounded-full border border-panel-frame/60 bg-snow px-3.5 py-1.5 text-xs font-semibold text-depths disabled:opacity-60"
            >
              Oznacz jako przeczytane
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
