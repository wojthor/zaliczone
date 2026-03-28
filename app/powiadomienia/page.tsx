import { MailboxView } from "@/components/powiadomienia/mailbox-view";
import { PageShell } from "@/components/page-shell";

export default function PowiadomieniaPage() {
  return (
    <PageShell title="Powiadomienia">
      <p className="text-muted mb-4 text-sm font-medium">
        Skrzynka wiadomości od rodziców i szkoły — podgląd demonstracyjny.
      </p>
      <MailboxView />
    </PageShell>
  );
}
