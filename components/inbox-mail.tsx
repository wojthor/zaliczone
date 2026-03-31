"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function useMinWidthMd() {
  const [mdUp, setMdUp] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(min-width: 768px)");
    const sync = () => setMdUp(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  return mdUp;
}

export function getInboxInitials(from: string): string {
  const parts = from.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]!.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g, "")[0];
    const b = parts[1]!.replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]/g, "")[0];
    if (a && b) return (a + b).toUpperCase();
  }
  const cleaned = from.replace(/\s+/g, "").slice(0, 2);
  return cleaned.toUpperCase() || "??";
}

/** Kontener listy jak zgrupowane wiersze w Mailu / iOS */
export function InboxGroupedList({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-2xl border border-panel-frame/35 bg-snow/95 shadow-[0_2px_20px_rgba(0,12,74,0.07)] backdrop-blur-[6px] md:max-h-[min(78vh,640px)]">
      <div className="min-h-0 flex-1 divide-y divide-panel-frame/25 overflow-y-auto scrollbar-panel">{children}</div>
    </div>
  );
}

type InboxMailRowProps = {
  from: string;
  subject: string;
  preview: string;
  date: string;
  unread: boolean;
  selected?: boolean;
  onActivate?: () => void;
};

export function InboxMailRow({ from, subject, preview, date, unread, selected, onActivate }: InboxMailRowProps) {
  const isSystem = from.toLowerCase().startsWith("system");

  const inner = (
    <>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-tight text-lime shadow-sm sm:h-12 sm:w-12 sm:text-xs ${
          isSystem ? "bg-linear-to-br from-[#1a237e] to-[#000C4A]" : "bg-[#000C4A]"
        }`}
        aria-hidden
      >
        {isSystem ? "⚙" : getInboxInitials(from)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`min-w-0 truncate text-[15px] leading-tight tracking-tight ${
              unread ? "font-semibold text-depths" : "font-medium text-depths/88"
            }`}
          >
            {from}
          </span>
          <time className="text-depths/55 shrink-0 text-[0.6875rem] font-medium tabular-nums">{date}</time>
        </div>
        <p
          className={`mt-0.5 truncate text-[0.8125rem] leading-snug tracking-tight ${
            unread ? "font-semibold text-depths" : "font-medium text-depths/75"
          }`}
        >
          {subject}
        </p>
        <p className="text-muted mt-1 line-clamp-2 text-[0.8125rem] leading-snug">{preview}</p>
      </div>
      <div className="flex w-5 shrink-0 flex-col items-center pt-2" aria-hidden>
        {unread ? <span className="h-2.5 w-2.5 rounded-full bg-[#0A84FF] shadow-sm" title="Nieprzeczytane" /> : null}
      </div>
    </>
  );

  const baseClass = `flex w-full gap-3 px-3 py-3 text-left transition-colors sm:gap-3.5 sm:px-4 sm:py-3.5 ${
    unread ? "bg-[#007AFF]/[0.06]" : "bg-transparent"
  } ${selected ? "ring-2 ring-inset ring-[#000C4A]/22 bg-luster/55" : ""} ${
    onActivate ? "cursor-pointer hover:bg-luster/90 active:bg-luster" : ""
  }`;

  if (onActivate) {
    return (
      <button type="button" className={baseClass} onClick={onActivate}>
        {inner}
      </button>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}

/** Panel z pełną treścią: meta w jednym bloku, treść w jednej kolumnie (bez kolumnowania tekstu). */
export function InboxDetailPanel({
  variant,
  fromLabel,
  secondaryLabel,
  date,
  subject,
  body,
}: {
  variant: "incoming" | "outgoing";
  fromLabel: string;
  secondaryLabel?: string;
  date: string;
  subject: string;
  body: string;
}) {
  const paragraphs = body.trim()
    ? body
        .split(/\n{2,}/)
        .map((c) => c.trim())
        .filter(Boolean)
    : [body];

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-2xl border border-panel-frame/35 bg-snow/95 p-4 shadow-[0_2px_20px_rgba(0,12,74,0.06)] sm:p-6 md:min-h-[min(78vh,640px)]">
      <p className="text-muted mb-3 text-[0.65rem] font-bold uppercase tracking-wide">
        {variant === "incoming" ? "Treść wiadomości" : "Podgląd wysłanej"}
      </p>

      <div className="rounded-xl border border-panel-frame/25 bg-luster/50 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
          <div className="min-w-0">
            <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">
              {variant === "incoming" ? "Od" : "Do"}
            </p>
            <p className="text-depths mt-1 text-sm font-semibold leading-snug">{fromLabel}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Data</p>
            <p className="text-depths/90 mt-1 text-sm tabular-nums leading-snug">{date}</p>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Temat</p>
            <p className="text-depths mt-1 text-sm font-semibold leading-snug">{subject}</p>
          </div>
        </div>
        {secondaryLabel && variant === "outgoing" ? (
          <p className="text-muted mt-4 border-t border-panel-frame/25 pt-4 text-xs leading-relaxed">
            <span className="font-semibold text-depths/75">Kanał: </span>
            {secondaryLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-5 min-h-0 flex-1">
        <p className="text-muted mb-3 text-[0.65rem] font-semibold uppercase tracking-wide">Treść</p>
        <div className="w-full space-y-4">
          {paragraphs.map((chunk, i) => (
            <p
              key={i}
              className="text-depths/90 wrap-break-word text-[0.9375rem] leading-[1.65] whitespace-pre-wrap"
            >
              {chunk}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InboxDetailPlaceholder() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-panel-frame/50 bg-luster/40 p-8 text-center md:min-h-[min(78vh,640px)]">
      <p className="text-depths text-sm font-semibold">Wybierz wiadomość</p>
      <p className="text-muted mt-2 max-w-xs text-xs leading-relaxed">
        Kliknij wpis na liście po lewej, aby zobaczyć pełną treść.
      </p>
    </div>
  );
}

/** Pełny podgląd na telefonie (gdy brak układu obok siebie). */
export function InboxDetailModal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
      <button type="button" className="absolute inset-0 bg-[#000C4A]/45 backdrop-blur-[2px]" aria-label="Zamknij" onClick={onClose} />
      <div
        className="relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border border-panel-frame/50 bg-snow p-4 shadow-[0_-8px_32px_rgba(0,12,74,0.15)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inbox-modal-title"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-panel-frame/40" aria-hidden />
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="inbox-modal-title" className="text-depths text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-bold text-[#000C4A]"
          >
            Zamknij
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type InboxSentRowProps = {
  to: string;
  subject: string;
  preview: string;
  date: string;
  selected?: boolean;
  onActivate?: () => void;
};

export function InboxSentRow({ to, subject, preview, date, selected, onActivate }: InboxSentRowProps) {
  const inner = (
    <>
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#000C4A]/10 text-sm text-depths/70 sm:h-12 sm:w-12"
        aria-hidden
      >
        ↑
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted min-w-0 truncate text-[0.6875rem] font-semibold uppercase tracking-wide">
            Wysłane · {to}
          </span>
          <time className="text-depths/55 shrink-0 text-[0.6875rem] font-medium tabular-nums">{date}</time>
        </div>
        <p className="text-depths mt-0.5 truncate text-[0.8125rem] font-semibold leading-snug">{subject}</p>
        <p className="text-muted mt-1 line-clamp-2 text-[0.8125rem] leading-snug">{preview}</p>
      </div>
    </>
  );

  const base = `flex w-full gap-3 bg-luster/35 px-3 py-3 text-left sm:gap-3.5 sm:px-4 sm:py-3.5 ${
    selected ? "ring-2 ring-inset ring-[#000C4A]/22 bg-luster/80" : ""
  } ${onActivate ? "cursor-pointer hover:bg-luster/90" : ""}`;

  if (onActivate) {
    return (
      <button type="button" className={base} onClick={onActivate}>
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
}
