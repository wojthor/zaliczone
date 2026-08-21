"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Spinner } from "@/components/ui/toast";

type Tone = "danger" | "positive" | "neutral";

type ConfirmDialogProps = {
  open: boolean;
  tone?: Tone;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  successMessage?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  /** Wywoływane natychmiast po sukcesie - np. router.refresh() / redirect, zanim dialog się zamknie. */
  onSuccess?: () => void;
  /** Dodatkowa treść (np. edytowalny input kwoty) między opisem a przyciskami - tylko faza „confirm”. */
  children?: ReactNode;
};

function ToneIcon({ tone, phase }: { tone: Tone; phase: "confirm" | "success" }) {
  if (phase === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (tone === "danger") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

/**
 * Współdzielony dialog potwierdzenia dla ważnych/nieodwracalnych akcji admina.
 * Zastępuje window.confirm() w całym /admin/*. Po sukcesie pokazuje krótki,
 * animowany stan „gotowe” zamiast cichego zamknięcia + odświeżenia.
 */
export function ConfirmDialog({
  open,
  tone = "neutral",
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  successMessage = "Zapisano.",
  onConfirm,
  onCancel,
  onSuccess,
  children,
}: ConfirmDialogProps) {
  const [phase, setPhase] = useState<"confirm" | "success">("confirm");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPhase("confirm");
      setBusy(false);
      setError(null);
    }
  }

  if (!open) return null;

  const ring = tone === "danger" ? "bg-claret" : tone === "positive" ? "bg-moss" : "bg-depths";
  const button =
    tone === "danger"
      ? "bg-claret hover:bg-claret/90"
      : tone === "positive"
        ? "bg-moss hover:bg-moss/90"
        : "bg-[#000C4A] hover:bg-[#000C4A]/90";

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setPhase("success");
      onSuccess?.();
      window.setTimeout(onCancel, 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#000C4A]/50"
        onClick={phase === "confirm" ? onCancel : undefined}
        aria-label="Zamknij"
      />
      <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,36rem)] w-full max-w-sm flex-col overflow-hidden rounded-t-app bg-snow text-center sm:rounded-app">
        <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-4 sm:pt-6">
        <span className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-snow ${ring}`}>
          <ToneIcon tone={tone} phase={phase} />
        </span>

        {phase === "confirm" ? (
          <>
            <h3 className="dash-sans text-depths text-lg font-bold leading-snug">{title}</h3>
            {description ? <p className="dash-sans text-muted mt-2 text-sm leading-relaxed">{description}</p> : null}
            {children ? <div className="mt-4">{children}</div> : null}
            {error ? <p className="dash-sans mt-3 text-sm font-semibold text-claret">{error}</p> : null}
          </>
        ) : (
          <div className="add-tutor-success-pop pb-2">
            <p className="dash-sans text-depths text-base font-bold">{successMessage}</p>
          </div>
        )}
        </div>

        {phase === "confirm" ? (
          <div className="flex shrink-0 flex-col-reverse justify-center gap-2 border-t border-panel-frame/30 px-6 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:pb-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="dash-sans rounded-ledger border border-panel-frame/40 px-4 py-2.5 text-xs font-bold text-depths transition hover:bg-luster/50 disabled:opacity-50 touch-manipulation sm:rounded-full sm:py-2"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={`dash-sans flex items-center justify-center gap-1.5 rounded-ledger px-4 py-2.5 text-xs font-bold text-snow transition disabled:opacity-60 touch-manipulation sm:rounded-full sm:py-2 ${button}`}
            >
              {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
              {confirmLabel}
            </button>
          </div>
        ) : (
          <div className="shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-6" />
        )}
      </div>
    </div>
  );
}
