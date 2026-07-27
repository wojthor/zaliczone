export type ListaPlacRow = {
  tutorId: string;
  tutorName: string;
  bankAccount: string | null;
  lessonCount: number;
  hours: number;
  lessonsPayoutPln: number;
  bonusPln: number;
  totalPln: number;
};

function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Miesiąc poprzedni względem YYYY-MM (miesiąc lekcji względem miesiąca wypłaty). */
export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m! - 2, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Nagłówki listy płac.
 * `payoutMonthKey` = miesiąc wypłaty (wybrany w UI, na starcie bieżący).
 * Okres umowy = miesiąc poprzedni; dyspozycja = wybrany miesiąc.
 */
export function listaPlacTitles(payoutMonthKey: string): {
  title: string;
  subtitle: string;
  workMonthKey: string;
} {
  const workMonthKey = previousMonthKey(payoutMonthKey);
  const [ys, ms] = workMonthKey.split("-").map(Number);
  const year = ys!;
  const month0 = ms! - 1;
  const first = new Date(year, month0, 1);
  const last = new Date(year, month0 + 1, 0);
  const payoutLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(Number(payoutMonthKey.slice(0, 4)), Number(payoutMonthKey.slice(5, 7)) - 1, 15),
  );
  const payoutCapitalized = payoutLabel.charAt(0).toUpperCase() + payoutLabel.slice(1);

  return {
    workMonthKey,
    title: `Lista Płac z tytułu umów zlecenia za okres: ${formatDdMmYyyy(first)} – ${formatDdMmYyyy(last)} r.`,
    subtitle: `Zrealizowana i postawiona do dyspozycji w miesiącu: ${payoutCapitalized} r.`,
  };
}
