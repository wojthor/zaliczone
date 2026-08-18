/** Kanoniczna lista metod płatności - wybór przy zatwierdzaniu wpłaty w Rozliczeniach. */
export const PAYMENT_METHODS = ["Przelew tradycyjny", "BLIK", "Przelewy24", "Gotówka"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}
