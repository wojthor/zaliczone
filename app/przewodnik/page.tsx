import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { COMPANY } from "@/lib/company";
import { DATES } from "@/lib/dates";
import { getCurrentUserProfile } from "@/lib/data/queries";

/** Jeden film instruktażowy - podmień URL gdy będzie gotowy (YouTube / Vimeo / plik). */
const GUIDE_VIDEO = {
  title: "Jak działa panel ZALICZONE",
  blurb:
    "Od terminarza i zaliczania lekcji, przez ewidencję godzin, po finanse i wypłatę - cały obieg w jednym nagraniu.",
  /** Ustaw np. https://www.youtube.com/embed/XXXX - puste = placeholder */
  embedUrl: "" as string,
};

function VideoBlock() {
  return (
    <article className="min-w-0 w-full">
      <div className="relative aspect-video overflow-hidden rounded-[1.75rem] bg-[#000C4A] shadow-[0_12px_32px_rgba(0,12,74,0.16)]">
        {GUIDE_VIDEO.embedUrl ? (
          <iframe
            title={GUIDE_VIDEO.title}
            src={GUIDE_VIDEO.embedUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #d7fe51 0%, transparent 45%), linear-gradient(225deg, #f7e9ad 0%, transparent 40%)",
              }}
              aria-hidden
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-lime/80 bg-lime/15 text-lime"
                aria-hidden
              >
                <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5 fill-current" aria-hidden>
                  <path d="M8 5.5v13l11-6.5L8 5.5z" />
                </svg>
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lime/70">
                Film instruktażowy · 16:9
              </p>
              <p className="text-xs font-medium text-luster/55">Wkrótce - jedno nagranie o całym panelu</p>
            </div>
          </>
        )}
      </div>
      <h3 className="text-depths mt-2.5 text-sm font-bold tracking-tight">{GUIDE_VIDEO.title}</h3>
      <p className="text-muted mt-0.5 text-xs leading-relaxed">{GUIDE_VIDEO.blurb}</p>
    </article>
  );
}

const DEADLINES = [
  {
    id: "ewidencja",
    when: `od ${DATES.ewidencja.unlockDayOfNextMonth}. do ${DATES.ewidencja.deadlineDayOfNextMonth}. dnia miesiąca`,
    what: "Ewidencja godzin za poprzedni miesiąc",
    how: `Od ${DATES.ewidencja.unlockDayOfNextMonth}. dnia kolejnego miesiąca wygeneruj PDF w Finansach. Podpisz i odeślij skan koordynatorowi - masz czas do ${DATES.ewidencja.deadlineDayOfNextMonth}. dnia.`,
    tag: "Termin",
  },
  {
    id: "wypłata",
    when: `do ${DATES.payout.deadlineDayOfNextMonth}. dnia miesiąca`,
    what: "Wypłata za poprzedni miesiąc",
    how: "Koordynator księguje wypłatę najpóźniej do tego dnia - status zobaczysz w Finansach.",
    tag: "Termin",
  },
  {
    id: "premia",
    when: `${DATES.bonus.hoursThreshold} h · +${DATES.bonus.bonusPln} zł`,
    what: "Premia miesięczna",
    how: "Liczą się tylko lekcje ze statusem „zatwierdzona”. Postęp widać na Dashboardzie.",
    tag: "Próg",
  },
] as const;

export default async function PrzewodnikPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  return (
    <PageShell title="Przewodnik">
      <p className="text-muted text-sm font-medium">
        Film instruktażowy, ważne terminy i dane firmy.
      </p>

      <section className="mt-6">
        <h2 className="section-label">Film instruktażowy</h2>
        <p className="text-muted mt-1 text-sm">Jak ogarnąć panel od A do Z.</p>
        <div className="mt-4">
          <VideoBlock />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="section-label">Ważne daty</h2>
        <p className="text-muted mt-1 text-sm">
          Stałe terminy w każdym cyklu rozliczeniowym - nie zależą od konkretnego miesiąca.
        </p>

        <ol className="mt-4 divide-y divide-mist overflow-hidden soft-panel">
          {DEADLINES.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6 sm:px-5"
            >
              <div className="sm:w-48 sm:shrink-0">
                <span className="inline-flex rounded-full bg-lime px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-depths">
                  {d.tag}
                </span>
                <p className="text-depths mt-1.5 text-base font-extrabold tracking-tight">{d.when}</p>
              </div>
              <div className="min-w-0 flex-1 border-t border-panel-frame/25 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                <p className="text-depths text-sm font-bold">{d.what}</p>
                <p className="text-muted mt-0.5 text-xs leading-relaxed">{d.how}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 soft-panel p-4 sm:p-5">
        <h2 className="section-label">Dane firmowe</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted text-[10px] font-bold uppercase tracking-[0.12em]">Nazwa</dt>
            <dd className="text-depths mt-0.5 font-semibold">{COMPANY.name}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted text-[10px] font-bold uppercase tracking-[0.12em]">Adres</dt>
            <dd className="text-depths mt-0.5 font-semibold">{COMPANY.address}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-2xl bg-[#000C4A] px-3.5 py-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-lime">Po co to jest</p>
          <p className="mt-1.5 text-sm leading-relaxed text-luster/90">
            Kupujesz coś do pracy, materiały albo sprzęt? Poproś sprzedawcę o{" "}
            <strong className="text-lime">fakturę</strong> na dane firmy powyżej, nie paragon. Sam
            paragon nie wystarczy do rozliczenia. Zrób zdjęcie lub skan faktury i wyślij
            koordynatorowi mailem, dopisz krótko, co to było.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
