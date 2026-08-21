"use server";

import { COMPANY } from "@/lib/company";
import { sendTutorWaitlistEmail } from "@/lib/emails/send";

export type WaitlistPayload = {
  email: string;
  level: string;
  subject: string;
  days: string[];
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Publiczne zgłoszenie z landingu (brak pasującego korepetytora).
 * Wysyła mail na kontakt firmy z kryteriami i adresem zwrotnym ucznia.
 */
export async function submitTutorWaitlist(
  payload: WaitlistPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = payload.email.trim().toLowerCase();
  const level = payload.level.trim();
  const subject = payload.subject.trim();
  const days = payload.days.map((d) => d.trim()).filter(Boolean);

  if (!isValidEmail(email)) {
    return { ok: false, error: "Podaj poprawny adres e-mail." };
  }
  if (!level || !subject || days.length === 0) {
    return { ok: false, error: "Uzupełnij poziom, przedmiot i dni." };
  }

  try {
    const result = await sendTutorWaitlistEmail({
      to: COMPANY.email,
      requesterEmail: email,
      level,
      subject,
      days,
    });
    if (result?.skipped) {
      return {
        ok: false,
        error: "Wysyłka e-maila jest chwilowo niedostępna. Napisz na " + COMPANY.email,
      };
    }
    return { ok: true };
  } catch (e) {
    console.error("[submitTutorWaitlist]", e);
    return { ok: false, error: "Nie udało się wysłać zgłoszenia. Spróbuj ponownie." };
  }
}
