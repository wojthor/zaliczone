"use server";

import {
  sendTutorWelcomeEmail as _welcome,
  sendEwidencjaRequestEmail as _ewidencja,
  sendPayoutConfirmationEmail as _payout,
  sendCennikUpdateEmail as _cennik,
} from "@/lib/emails/send";

export async function sendTutorWelcomeEmail(email: string, tempPassword: string) {
  return _welcome(email, tempPassword);
}

export async function sendEwidencjaRequestEmail(email: string, month: string) {
  return _ewidencja(email, month);
}

export async function sendPayoutConfirmationEmail(email: string, month: string, amount: number) {
  return _payout(email, month, amount);
}

export async function sendCennikUpdateEmail(emails: string[]) {
  return _cennik(emails);
}
