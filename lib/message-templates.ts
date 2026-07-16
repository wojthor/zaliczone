import type { MessageCategory, MessageTemplate } from "@/lib/types/messages";

export const MESSAGE_TEMPLATES = {
  EWIDENCJA: {
    title: "Prośba o ewidencję godzin",
    body: "Wygeneruj ewidencję w module Finanse, wydrukuj PDF, podpisz i prześlij skan do placówki. Bez podpisanego dokumentu nie możemy zaksięgować wypłaty.",
    category: "system" as MessageCategory,
    template: "EWIDENCJA" as MessageTemplate,
  },
  CENNIK: {
    title: "Aktualizacja cennika",
    body: "Administrator zaktualizował stawki w systemie. Sprawdź moduł Finanse / Profil — nowe kwoty obowiązują od teraz.",
    category: "system" as MessageCategory,
    template: "CENNIK" as MessageTemplate,
  },
  PAYOUT: {
    title: "Wypłata zaksięgowana",
    body: "Twoja wypłata za bieżący okres została oznaczona jako wykonana. Sprawdź konto bankowe w ciągu 1–2 dni roboczych.",
    category: "system" as MessageCategory,
    template: "PAYOUT" as MessageTemplate,
  },
} as const;

export type ComposeTemplateKey = keyof typeof MESSAGE_TEMPLATES | "CUSTOM";

export function getTemplatePreview(template: ComposeTemplateKey, monthLabel?: string) {
  if (template === "CUSTOM") {
    return { title: "Tytuł wiadomości…", body: "Treść wiadomości…" };
  }
  const preset = MESSAGE_TEMPLATES[template];
  const title =
    template === "EWIDENCJA" && monthLabel?.trim()
      ? `${preset.title} — ${monthLabel.trim()}`
      : preset.title;
  return { title, body: preset.body };
}
