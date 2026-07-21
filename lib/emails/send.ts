import { Resend } from "resend";

/**
 * Domena zaliczone.pl nie jest jeszcze zweryfikowana w Resend — do tego czasu Resend
 * pozwala wysyłać wyłącznie z adresu sandboksowego `onboarding@resend.dev` i wyłącznie
 * na zweryfikowany adres właściciela konta. Gdy domena zostanie zweryfikowana, zmień
 * `SANDBOX_MODE` na false i `FROM` niżej wróci na docelowy adres.
 */
const SANDBOX_MODE = true;
const SANDBOX_RECIPIENT = "voj.torres9@gmail.com";

const FROM = SANDBOX_MODE
  ? "ZALICZONE <onboarding@resend.dev>"
  : "ZALICZONE <powiadomienia@zaliczone.pl>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zaliczone.pl";

/** Kolory tożsamości ZALICZONE — te same wartości co w app/globals.css (@theme). */
const BRAND = {
  navy: "#000c4a",
  lime: "#d7fe51",
  butter: "#f7e9ad",
  luster: "#ebeffe",
  muted: "#5a6278",
};

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return null;
  }
  return new Resend(key);
}

/**
 * W sandboksie każdy e-mail leci na `SANDBOX_RECIPIENT` niezależnie od zamierzonego
 * odbiorcy — dopisujemy prawdziwego odbiorcę do tematu, żeby dało się to rozróżnić
 * w skrzynce testowej.
 */
function resolveRecipients(intended: string | string[]): { to: string[]; subjectSuffix: string } {
  const intendedList = Array.isArray(intended) ? intended : [intended];
  if (!SANDBOX_MODE) return { to: intendedList, subjectSuffix: "" };
  const alreadySandbox = intendedList.length === 1 && intendedList[0] === SANDBOX_RECIPIENT;
  return {
    to: [SANDBOX_RECIPIENT],
    subjectSuffix: alreadySandbox ? "" : ` (dla: ${intendedList.join(", ")})`,
  };
}

function formatMonthPl(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, (m ?? 1) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

/**
 * Wspólna „skórka" e-maili ZALICZONE — tabelaryczny layout (zgodność z klientami
 * pocztowymi), navy nagłówek z wordmarkiem w kursywie (bez obrazka — nie ma logo
 * w public/), reszta treści wstrzykiwana jako `bodyHtml`.
 */
function emailShell(bodyHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ZALICZONE</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.luster}; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.luster}; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border-radius:14px; overflow:hidden;">
            <tr>
              <td align="center" style="background-color:${BRAND.navy}; padding:28px 24px;">
                <span style="font-style:italic; font-weight:800; font-size:26px; letter-spacing:-0.03em; color:${BRAND.lime}; text-transform:uppercase;">
                  Zaliczone
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px 28px; color:${BRAND.navy}; font-size:15px; line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px 28px; color:${BRAND.muted}; font-size:12px; line-height:1.5;">
                Pozdrawiamy,<br />Zespół ZALICZONE
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendTutorWelcomeEmail(email: string, fullName?: string) {
  const resend = client();
  if (!resend) return { skipped: true };

  const greetingName = fullName?.trim() ? fullName.trim().split(" ")[0] : null;
  const { to, subjectSuffix } = resolveRecipients(email);
  const body = `
    <p style="margin:0 0 16px 0;">Cześć${greetingName ? `, ${greetingName}` : ""}!</p>
    <p style="margin:0 0 16px 0;">Twoje konto korepetytora w systemie <strong>ZALICZONE</strong> jest gotowe (adres: <strong>${email}</strong>). Dane logowania (hasło tymczasowe) przekaże Ci administrator placówki.</p>
    <p style="margin:0 0 20px 0;">Ze względów bezpieczeństwa <strong>zmień hasło od razu po pierwszym zalogowaniu</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background-color:${BRAND.lime}; border-radius:8px;">
          <a href="${APP_URL}/login" style="display:inline-block; padding:12px 28px; font-weight:bold; font-size:14px; color:${BRAND.navy}; text-decoration:none;">
            Zaloguj się
          </a>
        </td>
      </tr>
    </table>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Witaj w ZALICZONE — konto gotowe${subjectSuffix}`,
    html: emailShell(body, "Twoje konto korepetytora jest gotowe."),
  });
}

export async function sendEwidencjaRequestEmail(email: string, month: string) {
  const resend = client();
  if (!resend) return { skipped: true };

  const label = formatMonthPl(monthKeyFix(month));
  const { to, subjectSuffix } = resolveRecipients(email);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Prośba o ewidencję — ${label}${subjectSuffix}`,
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
  const { to, subjectSuffix } = resolveRecipients(email);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Wypłata zaksięgowana — ${label}${subjectSuffix}`,
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

  const { to, subjectSuffix } = resolveRecipients(emails);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Aktualizacja cennika ZALICZONE${subjectSuffix}`,
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
