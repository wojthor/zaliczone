import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { IconCalendar, IconGuide, IconWallet } from "@/components/icons";
import { COMPANY } from "@/lib/company";
import { DATES, formatMonthLongPl, guideDeadlines } from "@/lib/dates";
import { getCurrentUserProfile } from "@/lib/data/queries";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PrzewodnikPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const currentMonthLabel = formatMonthLongPl(currentMonthKey());
  const { previousMonthLabel, ewidencjaDeadlineLabel, ewidencjaOverdue, payoutAvailableLabel } =
    guideDeadlines();

  return (
    <PageShell title="Przewodnik">
      <p className="text-muted max-w-2xl text-sm font-medium">
        Terminy, instrukcje krok po kroku i dane firmowe potrzebne do rozliczeń — wszystko w jednym miejscu.
      </p>

      <section className="mt-6 rounded-app border-2 border-panel-frame bg-luster/50 p-4 sm:p-5">
        <h2 className="text-depths flex items-center gap-2 text-base font-semibold tracking-tight">
          <IconCalendar className="h-4.5 w-4.5 text-[#000C4A]" />
          Harmonogram — {currentMonthLabel}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-app bg-snow/95 p-3.5">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Ewidencja za {previousMonthLabel}</p>
            <p className={`mt-1 text-sm font-semibold ${ewidencjaOverdue ? "text-claret" : "text-depths"}`}>
              termin: {ewidencjaDeadlineLabel}
            </p>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Wygeneruj PDF w Finansach, podpisz i odeślij administratorowi — do 3. dnia bieżącego miesiąca.
            </p>
          </div>
          <div className="rounded-app bg-snow/95 p-3.5">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Wypłata za {previousMonthLabel}</p>
            <p className="text-depths mt-1 text-sm font-semibold">dostępna od: {payoutAvailableLabel}</p>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Po tej dacie administrator księguje wypłatę — status zobaczysz w Finansach.
            </p>
          </div>
          <div className="rounded-app bg-snow/95 p-3.5 sm:col-span-2">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Premia miesięczna</p>
            <p className="text-depths mt-1 text-sm font-semibold">
              +{DATES.bonus.bonusPln} zł po {DATES.bonus.hoursThreshold}h zatwierdzonych lekcji w miesiącu
            </p>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Postęp śledzisz na Dashboardzie — pasek premii liczy się z godzin lekcji ze statusem „zatwierdzona”.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-app bg-snow/95 p-4 shadow-sm sm:p-5">
        <h2 className="text-depths flex items-center gap-2 text-base font-semibold tracking-tight">
          <IconGuide className="h-4.5 w-4.5 text-[#000C4A]" />
          Krok po kroku
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-depths text-sm font-semibold">Zgłaszanie lekcji do weryfikacji</p>
            <ol className="text-muted mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
              <li>
                Wejdź w <strong className="text-depths">Terminarz</strong> lub kafelek tygodnia na Dashboardzie.
              </li>
              <li>Kliknij lekcję, która się odbyła — zmieni status na „oczekuje na weryfikację”.</li>
              <li>
                Administrator zatwierdza lekcję (status „zatwierdzona”) lub oznacza jako nieopłaconą — obie decyzje
                widzisz w Finansach.
              </li>
            </ol>
          </div>
          <div>
            <p className="text-depths text-sm font-semibold">Ewidencja godzin</p>
            <ol className="text-muted mt-2 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
              <li>
                Wejdź w <strong className="text-depths">Finanse</strong> i wybierz rozliczany miesiąc.
              </li>
              <li>
                W sekcji „Ewidencja godzin” kliknij <strong className="text-depths">Otwórz ewidencję do druku</strong>{" "}
                — dokument bierze wyłącznie lekcje zatwierdzone.
              </li>
              <li>Wydrukuj, podpisz i odeślij administratorowi skan przed terminem z harmonogramu powyżej.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-app border border-panel-frame/40 bg-jodhpur/70 p-4 sm:p-5">
        <h2 className="text-depths flex items-center gap-2 text-base font-semibold tracking-tight">
          <IconWallet className="h-4.5 w-4.5 text-[#000C4A]" />
          Dane firmowe
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Nazwa firmy</dt>
            <dd className="text-depths mt-0.5 font-semibold">{COMPANY.name}</dd>
          </div>
          <div>
            <dt className="text-muted text-xs font-semibold uppercase tracking-wide">NIP</dt>
            <dd className="text-depths mt-0.5 font-semibold">{COMPANY.nip}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Adres</dt>
            <dd className="text-depths mt-0.5 font-semibold">{COMPANY.address}</dd>
          </div>
        </dl>
        <p className="text-muted mt-4 text-xs leading-relaxed">
          Kupujesz materiały biurowe lub inne rzeczy potrzebne do pracy? Poproś sprzedawcę o{" "}
          <strong className="text-depths">fakturę</strong> (nie paragon) wystawioną na dane firmy powyżej — sam
          paragon nie wystarczy do rozliczenia kosztu. Skan lub zdjęcie faktury przekaż administratorowi mailem,
          razem z krótką notatką, co zostało kupione.
        </p>
      </section>
    </PageShell>
  );
}
