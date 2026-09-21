"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

const STORAGE_KEY = "zaliczone-privacy-consent-v1";

export function PrivacyConsentPopup() {
  const titleId = useId();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // private mode / blocked storage — i tak pokaż
    }
    const t = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center p-0 sm:items-end sm:justify-end sm:p-5">
      <div
        className="absolute inset-0 bg-[#000C4A]/40 backdrop-blur-[1px]"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="confirm-dialog-in relative z-10 w-full max-w-md overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#000C4A] text-luster shadow-[0_-8px_40px_rgba(0,12,74,0.35)] sm:rounded-[1.75rem]"
      >
        <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />
        <div className="px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime/80">
            RODO
          </p>
          <h2
            id={titleId}
            className="dash-sans mt-2 text-xl font-bold tracking-tight text-snow"
          >
            Zgoda na przetwarzanie danych
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-luster/85">
            Korzystając ze strony ZALICZONE, wyrażasz zgodę na przetwarzanie danych
            osobowych w celach opisanych w{" "}
            <Link
              href="/polityka-prywatnosci"
              className="font-semibold text-lime underline decoration-lime/40 underline-offset-2 hover:decoration-lime"
            >
              Polityce prywatności
            </Link>
            . Dane z formularzy (m.in. e-mail, preferencje korepetycji) służą wyłącznie do
            kontaktu i organizacji zajęć.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row-reverse sm:items-center">
            <button
              type="button"
              onClick={accept}
              className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-depths transition hover:brightness-105 sm:w-auto sm:min-w-[10rem]"
            >
              Akceptuję
            </button>
            <Link
              href="/polityka-prywatnosci"
              className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-snow/90 transition hover:bg-white/10 sm:w-auto"
            >
              Czytaj politykę
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
