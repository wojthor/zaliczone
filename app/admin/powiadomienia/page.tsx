"use client";

import { useEffect, useMemo, useState } from "react";
import {
  InboxDetailModal,
  InboxDetailPanel,
  InboxDetailPlaceholder,
  InboxGroupedList,
  InboxMailRow,
  InboxSentRow,
  useMinWidthMd,
} from "@/components/inbox-mail";
import { ADMIN_SYSTEM_ALERTS, ADMIN_TUTORS, type AdminSystemAlert } from "@/lib/admin-demo";

const RECIPIENT_ALL = "__all__";

function isMdUpFromWindow() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
}

type SentMessage = {
  id: string;
  to: string;
  subject: string;
  body: string;
  date: string;
};

type Selection = { kind: "inbox"; id: string } | { kind: "sent"; id: string };

export default function AdminPowiadomieniaPage() {
  const [inbox, setInbox] = useState<AdminSystemAlert[]>(() => [...ADMIN_SYSTEM_ALERTS]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [selection, setSelection] = useState<Selection>(() => ({
    kind: "inbox",
    id: ADMIN_SYSTEM_ALERTS[0]?.id ?? "",
  }));
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const mdUp = useMinWidthMd();

  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState(RECIPIENT_ALL);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (mdUp) setMobileSheetOpen(false);
  }, [mdUp]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRecipient(RECIPIENT_ALL);
    setTitle("");
    setBody("");
  }, [open]);

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    const toLabel =
      recipient === RECIPIENT_ALL
        ? "Wszyscy nauczyciele"
        : (ADMIN_TUTORS.find((t) => t.id === recipient)?.name ?? "—");
    const id = `sent-${crypto.randomUUID().slice(0, 10)}`;
    setSent((prev) => [
      { id, to: toLabel, subject: title.trim(), body: body.trim(), date: "Teraz" },
      ...prev,
    ]);
    setSelection({ kind: "sent", id });
    if (!isMdUpFromWindow()) setMobileSheetOpen(true);
    setOpen(false);
  };

  const selectInbox = (id: string) => {
    setSelection({ kind: "inbox", id });
    setInbox((prev) => prev.map((x) => (x.id === id ? { ...x, unread: false } : x)));
    if (!isMdUpFromWindow()) setMobileSheetOpen(true);
  };

  const selectSent = (id: string) => {
    setSelection({ kind: "sent", id });
    if (!isMdUpFromWindow()) setMobileSheetOpen(true);
  };

  const detailPayload = useMemo(() => {
    if (selection.kind === "inbox") {
      const row = inbox.find((x) => x.id === selection.id);
      if (!row) return null;
      return {
        variant: "incoming" as const,
        fromLabel: row.from,
        date: row.date,
        subject: row.subject,
        body: row.body,
        secondary: undefined as string | undefined,
      };
    }
    const row = sent.find((x) => x.id === selection.id);
    if (!row) return null;
    return {
      variant: "outgoing" as const,
      fromLabel: row.to,
      date: row.date,
      subject: row.subject,
      body: row.body,
      secondary: "Wiadomość w aplikacji (demo)",
    };
  }, [selection, inbox, sent]);

  const detail =
    detailPayload != null ? (
      <InboxDetailPanel
        variant={detailPayload.variant}
        fromLabel={detailPayload.fromLabel}
        date={detailPayload.date}
        subject={detailPayload.subject}
        body={detailPayload.body}
        secondaryLabel={detailPayload.secondary}
      />
    ) : (
      <InboxDetailPlaceholder />
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-depths text-2xl font-semibold tracking-tight">Powiadomienia</h1>
          <p className="text-muted mt-1 max-w-xl text-sm font-medium">
            Ten sam układ co u korepetytora: lista obok podglądu wiadomości (od tabletu). Wysyłanie — tylko tutaj.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full bg-[#000C4A] px-4 py-2.5 text-xs font-bold text-lime shadow-sm"
        >
          Nowa wiadomość
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,340px)_1fr] md:items-stretch md:gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="flex min-h-0 flex-col gap-5">
          <div>
            <h2 className="text-depths/80 mb-2 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wide">
              Automatyczne
            </h2>
            <InboxGroupedList>
              {inbox.map((m) => (
                <InboxMailRow
                  key={m.id}
                  from={m.from}
                  subject={m.subject}
                  preview={m.preview}
                  date={m.date}
                  unread={m.unread}
                  selected={selection.kind === "inbox" && selection.id === m.id}
                  onActivate={() => selectInbox(m.id)}
                />
              ))}
            </InboxGroupedList>
          </div>

          {sent.length > 0 ? (
            <div>
              <h2 className="text-depths/80 mb-2 pl-0.5 text-[0.8125rem] font-semibold uppercase tracking-wide">
                Wysłane
              </h2>
              <InboxGroupedList>
                {sent.map((m) => (
                  <InboxSentRow
                    key={m.id}
                    to={m.to}
                    subject={m.subject}
                    preview={m.body.length > 120 ? `${m.body.slice(0, 117)}…` : m.body}
                    date={m.date}
                    selected={selection.kind === "sent" && selection.id === m.id}
                    onActivate={() => selectSent(m.id)}
                  />
                ))}
              </InboxGroupedList>
            </div>
          ) : null}
        </div>

        {mdUp ? <div className="min-w-0">{detail}</div> : null}

        <InboxDetailModal
          open={mobileSheetOpen}
          title={selection.kind === "sent" ? "Wysłane" : "Wiadomość"}
          onClose={() => setMobileSheetOpen(false)}
        >
          {detailPayload ? (
            <InboxDetailPanel
              variant={detailPayload.variant}
              fromLabel={detailPayload.fromLabel}
              date={detailPayload.date}
              subject={detailPayload.subject}
              body={detailPayload.body}
              secondaryLabel={detailPayload.secondary}
            />
          ) : null}
        </InboxDetailModal>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50 backdrop-blur-[2px]"
            aria-label="Zamknij"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative z-10 max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-panel-frame/50 bg-snow/95 p-6 shadow-[0_8px_40px_rgba(0,12,74,0.12)] sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-msg-title"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-depths/60 hover:text-depths absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-xl font-light leading-none transition-colors hover:bg-luster/80 sm:right-4 sm:top-4"
              aria-label="Zamknij"
            >
              ×
            </button>
            <h2 id="admin-msg-title" className="text-depths pr-12 text-lg font-semibold tracking-tight">
              Nowa wiadomość
            </h2>
            <p className="text-muted mt-2 pr-10 text-xs leading-relaxed">
              Tylko administrator może wysyłać wiadomości do nauczycieli. Zapis w tej sesji — demo.
            </p>

            <label className="mt-5 grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Do</span>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="text-depths rounded-xl border-2 border-panel-frame bg-luster px-3 py-2.5 text-sm font-medium"
              >
                <option value={RECIPIENT_ALL}>Wszyscy nauczyciele</option>
                {ADMIN_TUTORS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Temat</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Temat wiadomości"
                className="text-depths rounded-xl border-2 border-panel-frame bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="mt-3 grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Treść</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Treść…"
                rows={6}
                className="text-depths min-h-32 resize-y rounded-xl border-2 border-panel-frame bg-white px-3 py-2.5 text-sm leading-relaxed"
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-panel-frame/50 px-4 py-2 text-xs font-bold text-depths"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!title.trim() || !body.trim()}
                className="rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:cursor-not-allowed disabled:opacity-45"
              >
                Wyślij
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
