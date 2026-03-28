import Link from "next/link";
import { PanelHeader } from "@/components/panel-header";
import { SeeMoreLink } from "@/components/see-more-link";

const ALERTS = [
  { id: "1", title: "Wypełnij ewidencję godzin", meta: "Termin: do piątku" },
  { id: "2", title: "Notatki przed lekcją", meta: "Ania — polski" },
  { id: "3", title: "Wiadomość od rodzica", meta: "Tomek K. — wczoraj" },
];

export function NotificationsPanel() {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-app border-2 border-panel-frame bg-jodhpur p-2.5">
      <PanelHeader
        title="Powiadomienia"
        compact
        action={<SeeMoreLink href="/powiadomienia" compact />}
      />
      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {ALERTS.map((a) => (
          <li
            key={a.id}
            className="flex min-h-0 flex-1 flex-col justify-center rounded-app bg-snow/95 py-2 pl-3 pr-2.5"
          >
            <p className="text-depths line-clamp-2 text-sm font-semibold leading-snug">{a.title}</p>
            <p className="text-muted mt-1 text-xs font-medium leading-snug">{a.meta}</p>
            <Link
              href={`/powiadomienia?id=${a.id}`}
              className="mt-2 inline-flex w-fit rounded-md bg-[#000C4A] px-2 py-1 text-xs font-bold text-lime transition-colors hover:bg-[#000C4A]/90"
            >
              Otwórz wiadomość
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
