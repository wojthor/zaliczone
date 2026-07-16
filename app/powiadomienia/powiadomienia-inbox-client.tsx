"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconBell } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import { markAllInboxRead, markInboxMessageRead } from "@/lib/actions/messages";
import type { InboxMessage } from "@/lib/types/messages";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function PowiadomieniaInboxClient({ initialMessages }: { initialMessages: InboxMessage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialMessages);
  const [selectedId, setSelectedId] = useState<string>(() => initialMessages[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const unreadCount = items.filter((item) => !item.readAt).length;

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const aUnread = !a.readAt;
        const bUnread = !b.readAt;
        if (aUnread !== bUnread) return Number(bUnread) - Number(aUnread);
        return b.createdAt.localeCompare(a.createdAt);
      }),
    [items],
  );

  function openMessage(msg: InboxMessage) {
    setSelectedId(msg.id);
    if (msg.readAt) return;
    setItems((prev) => prev.map((item) => (item.id === msg.id ? { ...item, readAt: new Date().toISOString() } : item)));
    startTransition(async () => {
      await markInboxMessageRead(msg.id);
      router.refresh();
    });
  }

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    startTransition(async () => {
      await markAllInboxRead();
      router.refresh();
    });
  }

  return (
    <PageShell title="Powiadomienia" fillViewport compact surface="luster">
      <section className="rounded-app border-2 border-panel-frame bg-jodhpur/85 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#000C4A] text-lime">
              <IconBell className="h-5 w-5" />
            </span>
            <div>
              <p className="text-depths text-sm font-semibold">Centrum powiadomień</p>
              <p className="text-muted text-xs font-medium">Wiadomości od placówki (tylko odczyt).</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-lime">
              {unreadCount > 0 ? `${unreadCount} nowe` : "Brak nowych"}
            </span>
            {unreadCount > 0 ? (
              <button type="button" onClick={markAllRead} disabled={pending} className="rounded-full bg-snow px-3 py-1.5 text-xs font-semibold text-depths disabled:opacity-60">
                Oznacz wszystkie
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-3 grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,360px)_1fr]">
        <section className="flex min-h-0 flex-col rounded-app border-2 border-panel-frame bg-snow/95 p-3">
          <div className="scrollbar-panel min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {sorted.length === 0 ? (
              <p className="text-muted py-8 text-center text-sm">Brak wiadomości.</p>
            ) : (
              sorted.map((item) => {
                const active = item.id === selectedId;
                const unread = !item.readAt;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openMessage(item)}
                    className={`flex w-full flex-col gap-2 rounded-app border px-3 py-3 text-left transition ${
                      active ? "border-[#000C4A]/30 bg-luster" : "border-panel-frame/20 bg-snow hover:bg-luster/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 h-8 w-1 rounded-full ${unread ? "bg-lime" : "bg-panel-frame/50"}`} />
                        <div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              item.category === "system" ? "bg-lime/20 text-depths" : "bg-depths/8 text-[#000C4A]"
                            }`}
                          >
                            {item.category === "system" ? "Automatyczne" : "Od pracodawcy"}
                          </span>
                          <p className="mt-1 text-sm font-semibold text-depths">{item.title}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-muted">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-depths/85">{item.body}</p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-app border-2 border-panel-frame bg-snow/95 p-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selected.category === "system" ? "bg-lime/20 text-depths" : "bg-depths/8 text-[#000C4A]"
                  }`}
                >
                  {selected.category === "system" ? "Automatyczne" : "Placówka"}
                </span>
                <span className="text-muted text-xs font-medium">{formatDate(selected.createdAt)}</span>
              </div>
              <h2 className="text-depths mt-3 text-xl font-semibold tracking-tight">{selected.title}</h2>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-app bg-luster/55 p-4 text-sm leading-relaxed whitespace-pre-wrap text-depths">
                {selected.body}
              </div>
            </>
          ) : (
            <div className="m-auto text-center">
              <p className="text-depths text-base font-semibold">Brak wiadomości</p>
              <p className="text-muted mt-1 text-sm">Administrator może wysłać Ci komunikat z panelu Powiadomienia.</p>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
