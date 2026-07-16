import { Resend } from "resend";

const FROM = "ZALICZONE <powiadomienia@zaliczone.pl>";

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return null;
  }
  return new Resend(key);
}

function formatMonthPl(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, (m ?? 1) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

export async function sendTutorWelcomeEmail(email: string, tempPassword: string) {
  const resend = client();
  if (!resend) return { skipped: true };

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Witaj w ZALICZONE — dane logowania",
    html: `
      <p>Cześć!</p>
      <p>Twoje konto korepetytora w systemie <strong>ZALICZONE</strong> jest gotowe.</p>
      <p><strong>E-mail:</strong> ${email}<br/>
      <strong>Hasło tymczasowe:</strong> ${tempPassword}</p>
      <p>Zaloguj się i zmień hasło po pierwszym wejściu.</p>
      <p>Pozdrawiamy,<br/>Zespół ZALICZONE</p>
    `,
  });
}

export async function sendEwidencjaRequestEmail(email: string, month: string) {
  const resend = client();
  if (!resend) return { skipped: true };

  const label = formatMonthPl(monthKeyFix(month));

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Prośba o ewidencję — ${label}`,
    html: `
      <p>Cześć!</p>
      <p>Administrator prosi o wygenerowanie i odesłanie podpisanej ewidencji za <strong>${label}</strong>.</p>
      <p>Wejdź w panel → Finanse → wybierz miesiąc → <strong>Generuj Ewidencję (PDF)</strong>, wydrukuj, podpisz i odeślij skan.</p>
      <p>Pozdrawiamy,<br/>ZALICZONE</p>
    `,
  });
}

export async function sendPayoutConfirmationEmail(email: string, month: string, amount: number) {
  const resend = client();
  if (!resend) return { skipped: true };

  const label = formatMonthPl(monthKeyFix(month));

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Wypłata zaksięgowana — ${label}`,
    html: `
      <p>Cześć!</p>
      <p>Potwierdzamy wypłatę za <strong>${label}</strong> w kwocie <strong>${amount.toLocaleString("pl-PL")} zł</strong>.</p>
      <p>Pozdrawiamy,<br/>ZALICZONE</p>
    `,
  });
}

export async function sendCennikUpdateEmail(emails: string[]) {
  const resend = client();
  if (!resend || emails.length === 0) return { skipped: true };

  await resend.emails.send({
    from: FROM,
    to: emails,
    subject: "Aktualizacja cennika ZALICZONE",
    html: `
      <p>Cześć!</p>
      <p>Administrator zaktualizował cennik w systemie ZALICZONE. Sprawdź zakładkę Finanse → Cennik.</p>
      <p>Pozdrawiamy,<br/>ZALICZONE</p>
    `,
  });
}

function monthKeyFix(month: string): string {
  return month.includes("-") ? month : month;
}
