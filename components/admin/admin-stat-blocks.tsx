"use client";

import Link from "next/link";

type StatTone = "default" | "danger" | "success" | "warn";

export type AdminStatItem = {
  label: string;
  value: string;
  tone?: StatTone;
  href?: string;
};

const TONE_CLASS: Record<StatTone, string> = {
  default: "border-panel-frame/35 bg-snow text-depths",
  danger: "border-red-400/40 bg-red-50/70 text-red-800",
  success: "border-green-700/35 bg-green-700/[0.07] text-green-800",
  warn: "border-amber-500/40 bg-amber-50/80 text-amber-900",
};

export function AdminStatBlocks({ items }: { items: AdminStatItem[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const tone = item.tone ?? "default";
        const className = `rounded-app border p-3 sm:p-3.5 ${TONE_CLASS[tone]} ${
          item.href ? "transition hover:opacity-90" : ""
        }`;
        const body = (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums sm:text-2xl">{item.value}</p>
          </>
        );
        if (item.href) {
          return (
            <Link key={item.label} href={item.href} className={className}>
              {body}
            </Link>
          );
        }
        return (
          <article key={item.label} className={className}>
            {body}
          </article>
        );
      })}
    </section>
  );
}
