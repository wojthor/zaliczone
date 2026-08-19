"use client";

import { useEffect, useId, useState } from "react";
import { TUTOR_PHOTO } from "@/lib/tutor-photo";

type Props = {
  currentUrl?: string | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onClearSaved?: () => void;
  clearing?: boolean;
  disabled?: boolean;
  /** Bez etykiety - np. w nagłówku profilu obok imienia */
  inline?: boolean;
  initials?: string;
};

export function TutorPhotoField({
  currentUrl,
  file,
  onFileChange,
  onClearSaved,
  clearing,
  disabled,
  inline,
  initials,
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
      setLocalError("Dozwolone: JPG, PNG, WebP.");
      onFileChange(null);
      return;
    }
    if (f.size > TUTOR_PHOTO.maxBytes) {
      setLocalError("Max 5 MB.");
      onFileChange(null);
      return;
    }
    onFileChange(f);
  }

  const actions = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <label
        htmlFor={inputId}
        className={`dash-sans cursor-pointer text-[0.7rem] font-semibold text-[#000C4A] underline-offset-2 hover:underline ${
          disabled ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {shown ? "Zmień" : "Dodaj"}
      </label>
      {file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick(null)}
          className="dash-sans text-[0.7rem] font-semibold text-steel hover:underline"
        >
          Anuluj
        </button>
      ) : null}
      {!file && currentUrl && onClearSaved ? (
        <button
          type="button"
          disabled={disabled || clearing}
          onClick={onClearSaved}
          className="dash-sans text-[0.7rem] font-semibold text-steel hover:underline disabled:opacity-60"
        >
          {clearing ? "Usuwanie…" : "Usuń"}
        </button>
      ) : null}
    </div>
  );

  const thumb = (
    <label
      htmlFor={inputId}
      title="Portret 3:4, zalecane 900×1200, max 5 MB"
      className={`relative aspect-[3/4] w-14 shrink-0 cursor-pointer overflow-hidden rounded-app border border-panel-frame/40 bg-mist ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt="" className="h-full w-full object-cover" />
      ) : initials ? (
        <span className="landing-navy flex h-full w-full items-center justify-center text-[0.65rem] font-extrabold text-lime">
          {initials}
        </span>
      ) : (
        <span className="flex h-full items-center justify-center px-1 text-center text-[9px] font-semibold leading-tight text-steel">
          Brak
        </span>
      )}
    </label>
  );

  const input = (
    <input
      id={inputId}
      type="file"
      accept={TUTOR_PHOTO.accept}
      disabled={disabled}
      className="sr-only"
      onChange={(e) => {
        onPick(e.target.files?.[0] ?? null);
        e.target.value = "";
      }}
    />
  );

  const errorOrHint = localError ? (
    <p className="dash-sans text-[0.65rem] font-semibold text-red-700" role="alert">
      {localError}
    </p>
  ) : (
    <p className="dash-sans text-muted text-[0.65rem]">3:4 · max 5 MB</p>
  );

  if (inline) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-1">
        {thumb}
        {input}
        {actions}
        {localError ? errorOrHint : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {thumb}
      {input}
      <div className="min-w-0">
        <p className="dash-sans text-xs font-semibold text-depths">Zdjęcie</p>
        {actions}
        {errorOrHint}
      </div>
    </div>
  );
}
