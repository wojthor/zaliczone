"use client";

import { useState } from "react";
import { DEMO_MESSAGES, type DemoMessage } from "@/lib/demo-data";

export function MailboxView() {
  const [selected, setSelected] = useState<DemoMessage | null>(DEMO_MESSAGES[0] ?? null);

  return (
    <div className="flex min-h-[420px] flex-col overflow-hidden rounded-app bg-snow/90 lg:flex-row">
      <aside className="flex max-h-[240px] flex-col bg-luster/80 lg:max-h-none lg:w-[min(100%,280px)] lg:shrink-0">
        <p className="text-depths px-3 py-2 text-xs font-bold uppercase tracking-wide">Skrzynka</p>
        <ul className="scrollbar-hide flex-1 space-y-0.5 overflow-y-auto px-1 pb-1">
          {DEMO_MESSAGES.map((m) => {
            const active = selected?.id === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    active ? "bg-jodhpur" : "bg-transparent hover:bg-snow/60"
                  }`}
                >
                  <span className="text-depths flex items-center justify-between gap-2 text-sm font-semibold">
                    <span className="truncate">{m.from}</span>
                    {m.unread ? (
                      <span className="shrink-0 rounded-full bg-[#000C4A] px-1.5 py-0.5 text-[0.65rem] font-bold text-lime">
                        Nowe
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted mt-0.5 line-clamp-1 text-xs font-medium">{m.subject}</span>
                  <span className="text-muted/80 mt-0.5 text-[0.65rem]">{m.date}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className="flex min-h-[280px] min-w-0 flex-1 flex-col bg-snow/95 p-4">
        {selected ? (
          <>
            <header className="pb-3">
              <h2 className="text-depths text-lg font-semibold leading-snug">{selected.subject}</h2>
              <p className="text-muted mt-1 text-sm">
                <span className="font-semibold text-depths/90">{selected.from}</span>
                <span className="mx-2 text-steel">·</span>
                {selected.date}
              </p>
            </header>
            <div className="text-depths mt-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed">{selected.body}</div>
            <div className="mt-4 flex flex-wrap gap-2 pt-3">
              <button
                type="button"
                className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
                onClick={() => alert("Tu powstanie odpowiedź (demo).")}
              >
                Odpowiedz
              </button>
              <button
                type="button"
                className="rounded-full bg-luster px-4 py-2 text-sm font-semibold text-depths"
                onClick={() => alert("Archiwizacja (demo).")}
              >
                Archiwizuj
              </button>
            </div>
          </>
        ) : (
          <p className="text-muted m-auto text-sm">Wybierz wiadomość z listy.</p>
        )}
      </section>
    </div>
  );
}
