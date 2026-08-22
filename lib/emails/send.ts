import { Resend } from "resend";

/** Nadawca z zweryfikowanej domeny Resend (zaliczone.edu.pl). */
const FROM = "ZALICZONE <kontakt@zaliczone.edu.pl>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zaliczone.edu.pl";

/** Kolory tożsamości ZALICZONE — te same wartości co w app/globals.css (@theme). */
const BRAND = {
  navy: "#000c4a",
  navyMid: "#001a6e",
  navyDeep: "#00082f",
  lime: "#d5ed21",
  softLime: "#dffd6f",
  paper: "#f6f5f0",
  snow: "#ffffff",
  mist: "#e8e8e6",
  muted: "#5f5e5a",
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

function pillButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;">
      <tr>
        <td align="center" style="background-color:${BRAND.lime}; border-radius:9999px;">
          <a href="${href}" style="display:inline-block; padding:14px 32px; font-weight:800; font-size:13px; letter-spacing:0.05em; text-transform:uppercase; color:${BRAND.navy}; text-decoration:none;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Wspólna „skórka" e-maili ZALICZONE — tabelaryczny layout (zgodność z klientami
 * pocztowymi), granatowy nagłówek jak ekran logowania, karta jak w panelu.
 */
function emailShell(bodyHtml: string, preheader: string): string {
  const headerGradient = `linear-gradient(165deg, ${BRAND.navy} 0%, ${BRAND.navyMid} 45%, ${BRAND.navyDeep} 100%)`;
  return `<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ZALICZONE</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BRAND.paper}; font-family:Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.paper}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background-color:${BRAND.snow}; border:1px solid rgba(0,12,74,0.1); border-radius:28px; overflow:hidden;">
            <tr>
              <td align="center" style="background:${headerGradient}; padding:36px 28px 32px 28px;">
                <span style="font-style:italic; font-weight:800; font-size:32px; letter-spacing:-0.04em; color:${BRAND.lime}; text-transform:uppercase; line-height:1;">
                  Zaliczone
                </span>
              </td>
            </tr>
            <tr>
              <td style="height:4px; background-color:${BRAND.lime}; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 32px 12px 32px; color:${BRAND.navy}; font-size:15px; line-height:1.65;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px; color:${BRAND.muted}; font-size:12px; line-height:1.55; border-top:1px solid ${BRAND.mist};">
                <p style="margin:20px 0 0 0;">Pozdrawiamy,<br /><strong style="color:${BRAND.navy};">Zespół ZALICZONE</strong></p>
                <p style="margin:16px 0 0 0; font-size:11px; color:${BRAND.muted};">
                  <a href="${APP_URL}" style="color:${BRAND.navy}; text-decoration:none;">zaliczone.edu.pl</a>
                </p>
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
    <p style="margin:0 0 8px 0; font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:${BRAND.muted};">
      Panel korepetytora
    </p>
    <p style="margin:0 0 4px 0; font-size:22px; font-weight:800; letter-spacing:-0.02em; line-height:1.25; color:${BRAND.navy};">
      Cześć${greetingName ? `, ${greetingName}` : ""}!
    </p>
    <p style="margin:16px 0 0 0;">
      Masz dostęp do panelu <strong>ZALICZONE</strong>. Ustaw hasło poniżej — potem od razu wejdziesz do konta.
    </p>
    ${pillButton(inviteUrl, "Ustaw hasło")}
    <p style="margin:24px 0 0 0; padding:16px 18px; background-color:${BRAND.paper}; border:1px solid rgba(0,12,74,0.08); border-radius:16px; font-size:12px; color:${BRAND.muted}; line-height:1.55;">
      Link działa jednorazowo. Gdy wygasa, napisz na
      <a href="mailto:kontakt@zaliczone.edu.pl" style="color:${BRAND.navy}; font-weight:700; text-decoration:none;">kontakt@zaliczone.edu.pl</a>
      - wyślemy nowy.
    </p>
  `;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Ustaw hasło do panelu ZALICZONE${subjectSuffix}`,
    html: emailShell(body, "Ustaw hasło i wejdź do panelu ZALICZONE."),
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
