import { Resend } from "resend";

/** Nadawca z zweryfikowanej domeny Resend (zaliczone.edu.pl). */
const FROM = "ZALICZONE <powiadomienia@zaliczone.edu.pl>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zaliczone.edu.pl";

/** Kolory tożsamości ZALICZONE - te same wartości co w app/globals.css (@theme). */
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
    console.warn("[email] RESEND_API_KEY missing - skipping send");
    return null;
  }
  return new Resend(key);
}

function resolveRecipients(intended: string | string[]): { to: string[]; subjectSuffix: string } {
  const intendedList = Array.isArray(intended) ? intended : [intended];
  return { to: intendedList, subjectSuffix: "" };
}

function formatMonthPl(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, (m ?? 1) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

/**
 * Wspólna „skórka" e-maili ZALICZONE - tabelaryczny layout (zgodność z klientami
 * pocztowymi), navy nagłówek z wordmarkiem w kursywie (bez obrazka - nie ma logo
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

export async function sendTutorWelcomeEmail(
  email: string,
  fullName: string | undefined,
  inviteUrl: string,
) {
  const resend = client();
  if (!resend) return { skipped: true };

  const greetingName = fullName?.trim() ? fullName.trim().split(" ")[0] : null;
  const { to, subjectSuffix } = resolveRecipients(email);
  const body = `
    <p style="margin:0 0 16px 0;">Cześć${greetingName ? `, ${greetingName}` : ""}!</p>
    <p style="margin:0 0 16px 0;">Koordynator założył Ci konto w <strong>ZALICZONE</strong>. Kliknij przycisk poniżej, żeby ustawić hasło i wejść do panelu.</p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="background-color:${BRAND.lime}; border-radius:8px;">
          <a href="${inviteUrl}" style="display:inline-block; padding:12px 28px; font-weight:bold; font-size:14px; color:${BRAND.navy}; text-decoration:none;">
            Ustaw hasło
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0; font-size:12px; color:${BRAND.muted};">Link jest jednorazowy. Jeśli nie działa, poproś koordynatora o nowe zaproszenie.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Zaproszenie do ZALICZONE${subjectSuffix}`,
    html: emailShell(body, "Ustaw hasło i wejdź do panelu korepetytora."),
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
    subject: `Wypłata zaksięgowana - ${label}${subjectSuffix}`,
    html: `
      <p>Cześć!</p>
      <p>Potwierdzamy wypłatę za <strong>${label}</strong> w kwocie <strong>${amount.toLocaleString("pl-PL")} zł</strong>.</p>
      <p>Pozdrawiamy,<br/>ZALICZONE</p>
    `,
  });
}

/** Zgłoszenie z landingu: uczeń chce korepetycje, a nie ma aktualnie pasującego nauczyciela. */
export async function sendTutorWaitlistEmail(input: {
  to: string;
  requesterEmail: string;
  level: string;
  subject: string;
  days: string[];
}) {
  const resend = client();
  if (!resend) return { skipped: true as const };

  const { to, subjectSuffix } = resolveRecipients(input.to);
  const daysLabel = input.days.length > 0 ? input.days.join(", ") : "—";
  const body = `
    <p style="margin:0 0 16px 0;"><strong>Nowe zgłoszenie z landingu</strong> - brak pasującego korepetytora.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; font-size:14px; line-height:1.55; color:${BRAND.navy};">
      <tr>
        <td style="padding:6px 0; color:${BRAND.muted}; width:34%;">E-mail</td>
        <td style="padding:6px 0;"><a href="mailto:${input.requesterEmail}" style="color:${BRAND.navy}; font-weight:bold;">${input.requesterEmail}</a></td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:${BRAND.muted};">Poziom</td>
        <td style="padding:6px 0; font-weight:bold;">${input.level}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:${BRAND.muted};">Przedmiot</td>
        <td style="padding:6px 0; font-weight:bold;">${input.subject}</td>
      </tr>
      <tr>
        <td style="padding:6px 0; color:${BRAND.muted};">Dni</td>
        <td style="padding:6px 0; font-weight:bold;">${daysLabel}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0; font-size:12px; color:${BRAND.muted};">Odpisz na podany adres, gdy pojawi się pasujący nauczyciel.</p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    replyTo: input.requesterEmail,
    subject: `Zgłoszenie korepetycji: ${input.subject} · ${input.level}${subjectSuffix}`,
    html: emailShell(body, `Zgłoszenie od ${input.requesterEmail}`),
  });

  return { skipped: false as const };
}

function monthKeyFix(month: string): string {
  return month.includes("-") ? month : month;
}
