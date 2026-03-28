import { PageShell } from "@/components/page-shell";
import { TerminarzPageView } from "@/components/terminarz/terminarz-page-view";

export default function TerminarzPage() {
  return (
    <PageShell title="Terminarz">
      <TerminarzPageView />
    </PageShell>
  );
}
