"use client";

import { useMemo, useState } from "react";
import { IconBell } from "@/components/icons";
import { PageShell } from "@/components/page-shell";
import { DEMO_MESSAGES, type DemoMessage } from "@/lib/demo-data";

export default function PowiadomieniaPage() {
  const [items, setItems] = useState<DemoMessage[]>(() => [...DEMO_MESSAGES]);
  const [selectedId, setSelectedId] = useState<string>(() => DEMO_MESSAGES[0]?.id ?? "");

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const unreadCount = items.filter((item) => item.unread).length;

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.unread !== b.unread) return Number(b.unread) - Number(a.unread);
        return Number(a.id) - Number(b.id);
      }),
    [items],
  );

  function openMessage(id: string) {
    setSelectedId(id);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, unread: false } : item)));
  }

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
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
              <p className="text-muted text-xs font-medium">Pracodawca i automatyczne komunikaty systemowe.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-lime">
              {unreadCount > 0 ? `${unreadCount} nowe` : "Brak nowych"}
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-full bg-snow px-3 py-1.5 text-xs font-semibold text-depths"
              >
                Oznacz wszystkie
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-3 grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,360px)_1fr]">
        <section className="flex min-h-0 flex-col rounded-app border-2 border-panel-frame bg-snow/95 p-3">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <StatCard label="Nieprzeczytane" value={String(unreadCount)} dark />
            <StatCard label="Łącznie" value={String(items.length)} />
            <StatCard label="Przeczytane" value={String(items.length - unreadCount)} />
          </div>
          <div className="scrollbar-panel min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {sorted.map((item) => {
              const active = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openMessage(item.id)}
                  className={`flex w-full flex-col gap-2 rounded-app border px-3 py-3 text-left transition ${
                    active ? "border-[#000C4A]/30 bg-luster" : "border-panel-frame/20 bg-snow hover:bg-luster/70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 h-8 w-1 rounded-full ${item.unread ? "bg-lime" : "bg-panel-frame/50"}`} />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              item.category === "system"
                                ? "bg-lime/20 text-depths"
                                : "bg-depths/8 text-[#000C4A]"
                            }`}
                          >
                            {item.category === "system" ? "Automatyczne" : "Od pracodawcy"}
                          </span>
                          {item.unread ? (
                            <span className="rounded-full bg-[#000C4A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime">
                              Nowe
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-depths">{item.subject}</p>
                        <p className="text-muted mt-0.5 text-xs font-medium">{item.from}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-muted">{item.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-depths/85">{item.preview}</p>
                  <span className="text-xs font-semibold text-[#000C4A]">{item.unread ? "Otwórz" : "Przeczytane"}</span>
                </button>
              );
            })}
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
                <span className="text-muted text-xs font-medium">{selected.date}</span>
              </div>
              <h2 className="text-depths mt-3 text-xl font-semibold tracking-tight">{selected.subject}</h2>
              <p className="text-muted mt-1 text-sm font-medium">{selected.from}</p>
              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-app bg-luster/55 p-4 text-sm leading-relaxed text-depths whitespace-pre-wrap">
                {selected.body}
              </div>
            </>
          ) : (
            <div className="m-auto text-center">
              <p className="text-depths text-base font-semibold">Brak wybranego komunikatu</p>
              <p className="text-muted mt-1 text-sm">Wybierz wiadomość z listy po lewej.</p>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function StatCard({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-app px-3 py-2 ${dark ? "bg-[#000C4A] text-lime" : "bg-luster text-depths"}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${dark ? "text-lime/70" : "text-muted"}`}>{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}
