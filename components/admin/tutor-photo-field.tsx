"use client";

import { useEffect, useId, useState } from "react";
import { TUTOR_PHOTO, tutorPhotoSizeLabel } from "@/lib/tutor-photo";

type Props = {
  /** Aktualny URL z profilu (po zapisie) */
  currentUrl?: string | null;
  /** Lokalny plik wybrany w formularzu (create / przed uploadem) */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Opcjonalnie: usuń zdjęcie z profilu (tylko gdy jest currentUrl) */
  onClearSaved?: () => void;
  clearing?: boolean;
  disabled?: boolean;
};

export function TutorPhotoField({
  currentUrl,
  file,
  onFileChange,
  onClearSaved,
  clearing,
  disabled,
}: Props) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || currentUrl || null;

  function onPick(f: File | null) {
    setLocalError(null);
    if (!f) {
      onFileChange(null);
      return;
    }
    if (!(TUTOR_PHOTO.mimeTypes as readonly string[]).includes(f.type)) {
      setLocalError("Dozwolone formaty: JPG, PNG, WebP.");
      onFileChange(null);
      return;
    }
    if (f.size > TUTOR_PHOTO.maxBytes) {
      setLocalError("Plik jest za duży (max 5 MB).");
      onFileChange(null);
      return;
    }
    onFileChange(f);
  }

  return (
    <div className="grid gap-2">
      <span className="dash-sans text-xs font-semibold text-depths/80">Zdjęcie na landing</span>
      <p className="dash-sans text-muted text-[11px] leading-snug">{TUTOR_PHOTO.hint}</p>
      <p className="dash-sans text-[11px] font-semibold text-[#000C4A]/80">
        Docelowe wymiary: {tutorPhotoSizeLabel()}
      </p>

      <div className="flex flex-wrap items-start gap-4">
        <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-app border border-panel-frame/40 bg-mist sm:w-32">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold text-steel">
              Brak zdjęcia
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label
            htmlFor={inputId}
            className={`dash-sans inline-flex w-fit cursor-pointer rounded-full border border-panel-frame/40 bg-transparent px-3.5 py-2 text-xs font-bold text-depths hover:bg-paper ${
              disabled ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {shown ? "Zmień zdjęcie" : "Wybierz zdjęcie"}
          </label>
          <input
            id={inputId}
            type="file"
            accept={TUTOR_PHOTO.accept}
            disabled={disabled}
            className="sr-only"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(null)}
              className="dash-sans w-fit text-xs font-semibold text-steel underline-offset-2 hover:underline"
            >
              Anuluj wybór pliku
            </button>
          ) : null}
          {!file && currentUrl && onClearSaved ? (
            <button
              type="button"
              disabled={disabled || clearing}
              onClick={onClearSaved}
              className="dash-sans w-fit text-xs font-semibold text-steel underline-offset-2 hover:underline disabled:opacity-60"
            >
              {clearing ? "Usuwanie…" : "Usuń zdjęcie z profilu"}
            </button>
          ) : null}
          {localError ? (
            <p className="dash-sans text-xs font-semibold text-red-700" role="alert">
              {localError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
