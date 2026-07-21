import { createServiceClient } from "@/lib/supabase/admin";

/** "YYYY-MM-DD" → "YYYY-MM" */
export function monthKeyFromDate(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/**
 * Zabezpieczenie przed modyfikacją danych zamkniętego miesiąca.
 * Wołane na starcie każdej Server Action, która zmienia lekcje, wypłaty lub koszty —
 * niezależnie z jakiego widoku (kalendarz, terminarz, panel admina) pochodzi akcja.
 */
export async function assertMonthOpen(monthKey: string): Promise<void> {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("closed_months")
    .select("month")
    .eq("month", monthKey)
    .maybeSingle();

  if (error) {
    const msg = error.message ?? "";
    // Tabela może nie istnieć przed migracją — nie blokuj UI w tym przypadku.
    if (msg.includes("closed_months") || msg.includes("schema cache") || error.code === "42P01" || error.code === "PGRST205") {
      return;
    }
    throw error;
  }

  if (data) {
    throw new Error("Ten miesiąc jest już zamknięty - modyfikacja zabroniona");
  }
}
