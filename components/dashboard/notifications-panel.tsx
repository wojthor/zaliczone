import Link from "next/link";
import { PanelHeader } from "@/components/panel-header";
import type { InboxMessage } from "@/lib/types/messages";

export function NotificationsPanel({ messages }: { messages: InboxMessage[] }) {
  const alerts = messages.slice(0, 3);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-app border-2 border-panel-frame bg-jodhpur p-2.5">
      <PanelHeader title="Powiadomienia" compact />
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {alerts.length === 0 ? (
          <li className="text-muted flex flex-1 items-center justify-center rounded-app bg-snow/95 p-3 text-xs">
            Brak wiadomości
          </li>
        ) : (
          alerts.map((item) => (
            <li key={item.id} className="flex min-h-0 flex-1 flex-col justify-center rounded-app bg-snow/95 py-2 pl-3 pr-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    item.category === "system" ? "bg-lime/20 text-depths" : "bg-depths/8 text-[#000C4A]"
                  }`}
                >
                  {item.category === "system" ? "Panel" : "Placówka"}
                </span>
                {!item.readAt ? (
                  <span className="rounded-full bg-[#000C4A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime">
                    Nowe
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-semibold leading-snug text-depths">{item.title}</p>
              <Link
                href="/powiadomienia"
                className="mt-2 inline-flex w-fit rounded-md bg-[#000C4A] px-2 py-1 text-xs font-bold text-lime transition-colors hover:bg-[#000C4A]/90"
              >
                Otwórz
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
