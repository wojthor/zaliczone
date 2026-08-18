"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "@/lib/actions/notifications";
import type { AppNotification, NotificationKind } from "@/lib/types/database";

const KIND_LABEL: Record<NotificationKind, string> = {
  EWIDENCJA_REQUEST: "Ewidencja",
  CENNIK_UPDATE: "Cennik",
  PAYOUT: "Wypłata",
  INFO: "Info",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function NotificationsList({ items }: { items: AppNotification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-muted py-8 text-center text-sm">Brak powiadomień.</p>;
  }

  function markRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-app border border-panel-frame/40 bg-snow md:block">
        <table className="w-full min-w-[40rem] text-left">
          <thead>
            <tr className="border-b border-panel-frame/40 bg-jodhpur/80">
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Data</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Typ</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Tytuł</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Treść</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Status</th>
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Akcja</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const unread = !item.readAt;
              return (
                <tr key={item.id} className="border-b border-mist last:border-0">
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-depths">
                    {formatWhen(item.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-depths">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-depths">{item.title}</td>
                  <td className="text-muted max-w-xs px-3 py-2.5 text-sm">{item.body}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">
                    {unread ? (
                      <span className="text-depths">Nowe</span>
                    ) : (
                      <span className="text-muted">Przeczytane</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <RowActions item={item} pending={pending} onRead={() => markRead(item.id)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-mist rounded-app border border-panel-frame/40 bg-snow px-3 md:hidden">
        {items.map((item) => {
          const unread = !item.readAt;
          return (
            <li key={item.id} className={`py-3.5 ${unread ? "" : "opacity-70"}`}>
              <p className="text-sm font-bold text-depths">
                {unread ? <span className="mr-2 inline-block h-2 w-2 rounded-full bg-lime" /> : null}
                {item.title}
              </p>
              <p className="text-muted mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
                {KIND_LABEL[item.kind] ?? item.kind}
              </p>
              <p className="text-muted mt-1 text-sm leading-relaxed">{item.body}</p>
              <p className="text-muted mt-1.5 text-[11px]">{formatWhen(item.createdAt)}</p>
              <div className="mt-2">
                <RowActions item={item} pending={pending} onRead={() => markRead(item.id)} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RowActions({
  item,
  pending,
  onRead,
}: {
  item: AppNotification;
  pending: boolean;
  onRead: () => void;
}) {
  const unread = !item.readAt;
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {item.href ? (
        <Link
          href={item.href}
          className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-semibold text-lime"
        >
          Otwórz
        </Link>
      ) : null}
      {unread ? (
        <button
          type="button"
          disabled={pending}
          onClick={onRead}
          className="rounded-full border border-mist bg-snow px-3 py-1.5 text-xs font-semibold text-depths disabled:opacity-60"
        >
          Przeczytane
        </button>
      ) : null}
    </div>
  );
}
