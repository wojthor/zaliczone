/** Wymiary i limity zdjęcia nauczyciela (landing, kafelek 3:4). */
export const TUTOR_PHOTO = {
  aspectLabel: "3:4",
  recommendedWidth: 900,
  recommendedHeight: 1200,
  minWidth: 600,
  minHeight: 800,
  maxBytes: 5 * 1024 * 1024,
  accept: "image/jpeg,image/png,image/webp",
  mimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  bucket: "tutor-photos",
  /** Krótka podpowiedź pod polem w formularzu admina */
  hint:
    "Portret pionowy 3:4 — zalecane 900×1200 px (min. 600×800). JPG / PNG / WebP, max 5 MB. Tak wygląda kafelek na stronie głównej.",
} as const;

export function tutorPhotoSizeLabel(): string {
  return `${TUTOR_PHOTO.recommendedWidth}×${TUTOR_PHOTO.recommendedHeight} px (${TUTOR_PHOTO.aspectLabel})`;
}
