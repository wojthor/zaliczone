"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendAdminBroadcast } from "@/lib/actions/messages";
import { getTemplatePreview, type ComposeTemplateKey } from "@/lib/message-templates";
import type { Profile } from "@/lib/types/database";

const TEMPLATE_OPTIONS: { id: ComposeTemplateKey; label: string }[] = [
  { id: "EWIDENCJA", label: "Automatyczna: Prośba o ewidencję" },
  { id: "CENNIK", label: "Automatyczna: Aktualizacja cennika" },
  { id: "PAYOUT", label: "Automatyczna: Informacja o wypłacie" },
  { id: "CUSTOM", label: "Wiadomość własna" },
];

type RecipientMode = "all" | "selected";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function previousMonthKey(d = new Date()): string {
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 15);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLongPl(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(y!, m! - 1, 15),
  );
}

function buildMonthOptions(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function PowiadomieniaAdminClient({ tutors }: { tutors: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [template, setTemplate] = useState<ComposeTemplateKey>("CUSTOM");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [ewidencjaMonthKey, setEwidencjaMonthKey] = useState(previousMonthKey());
  const [feedback, setFeedback] = useState("");

  const monthLabel = useMemo(() => formatMonthLongPl(ewidencjaMonthKey), [ewidencjaMonthKey]);
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const preview = useMemo(
    () => getTemplatePreview(template, monthLabel),
    [template, monthLabel],
  );
  const isAutomatic = template !== "CUSTOM";

  function handleTemplateChange(next: ComposeTemplateKey) {
    setTemplate(next);
    setTitle("");
    setBody("");
    setFeedback("");
    if (next === "EWIDENCJA") {
      setEwidencjaMonthKey(previousMonthKey());
    }
  }

  function toggleTutor(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");

    if (recipientMode === "selected" && selected.length === 0) {
      setFeedback("Wybierz co najmniej jednego korepetytora.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await sendAdminBroadcast({
          template,
          title,
          body,
          sendToAll: recipientMode === "all",
          recipientIds: selected,
          monthLabel: template === "EWIDENCJA" ? monthLabel : undefined,
          monthKey: template === "EWIDENCJA" ? ewidencjaMonthKey : undefined,
        });
        const unlockNote =
          template === "EWIDENCJA"
            ? ` Odblokowano ewidencję za ${monthLabel} (${ewidencjaMonthKey}).`
            : "";
        setFeedback(`Wysłano do ${result.count} korepetytorów (skrzynka wewnętrzna).${unlockNote}`);
        setTitle("");
        setBody("");
        if (recipientMode === "selected") setSelected([]);
        router.refresh();
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : "Nie udało się wysłać wiadomości.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-depths text-2xl font-semibold tracking-tight">Powiadomienia</h1>
        <p className="text-muted mt-1 text-sm">
          Wewnętrzna skrzynka — wiadomości trafiają do panelu korepetytora (bez Resend). Szablon
          EWIDENCJA dodatkowo odblokowuje ewidencję godzin dla wybranego miesiąca.
        </p>
      </div>

      <form onSubmit={handleSend} className="rounded-app border border-panel-frame/35 bg-snow p-4 sm:p-5">
        <h2 className="text-depths text-base font-semibold">Nowa wiadomość</h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1 lg:col-span-2">
            <span className="text-xs font-semibold text-depths/80">Typ wiadomości</span>
            <select
              value={template}
              onChange={(e) => handleTemplateChange(e.target.value as ComposeTemplateKey)}
              className="rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {template === "EWIDENCJA" ? (
            <label className="grid gap-1 lg:col-span-2">
              <span className="text-xs font-semibold text-depths/80">
                Miesiąc ewidencji (odblokowanie + tytuł)
              </span>
              <select
                value={ewidencjaMonthKey}
                onChange={(e) => setEwidencjaMonthKey(e.target.value)}
                className="rounded-app border border-panel-frame/40 px-3 py-2 text-sm capitalize"
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatMonthLongPl(key)}
                    {key === currentMonthKey() ? " (bieżący)" : ""}
                  </option>
                ))}
              </select>
              <span className="text-muted text-[0.65rem]">
                Po wysłaniu ustawiane jest <code>ewidencja_unlocked_for_month = {ewidencjaMonthKey}</code>{" "}
                u wybranych korepetytorów.
              </span>
            </label>
          ) : null}

          <label className="grid gap-1 lg:col-span-2">
            <span className="text-xs font-semibold text-depths/80">Tytuł</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required={!isAutomatic}
              placeholder={preview.title}
              className="rounded-app border border-panel-frame/40 px-3 py-2 text-sm placeholder:text-muted/70"
            />
            {isAutomatic ? (
              <span className="text-muted text-[0.65rem]">
                Puste pole = domyślny tytuł szablonu (widoczny w placeholderze).
              </span>
            ) : null}
          </label>

          <label className="grid gap-1 lg:col-span-2">
            <span className="text-xs font-semibold text-depths/80">Treść</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required={!isAutomatic}
              rows={isAutomatic ? 6 : 5}
              placeholder={preview.body}
              className="rounded-app border border-panel-frame/40 px-3 py-2 text-sm placeholder:text-muted/70"
            />
            {isAutomatic ? (
              <span className="text-muted text-[0.65rem]">
                Puste pole = domyślna treść szablonu (widoczna w placeholderze). Możesz ją nadpisać własnym tekstem.
              </span>
            ) : null}
          </label>
        </div>

        <div className="mt-4 rounded-app border border-panel-frame/25 bg-luster/40 p-3">
          <p className="text-xs font-semibold text-depths/80">Odbiorcy</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-depths">
              <input
                type="radio"
                name="recipientMode"
                checked={recipientMode === "all"}
                onChange={() => setRecipientMode("all")}
              />
              Wszyscy korepetytorzy ({tutors.length})
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-depths">
              <input
                type="radio"
                name="recipientMode"
                checked={recipientMode === "selected"}
                onChange={() => setRecipientMode("selected")}
              />
              Wybrani korepetytorzy
            </label>
          </div>

          {recipientMode === "selected" ? (
            <div className="mt-3">
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(tutors.map((t) => t.id))}
                  className="rounded-full border border-panel-frame/40 px-2.5 py-0.5 text-[0.65rem] font-bold text-depths hover:bg-white"
                >
                  Zaznacz wszystkich
                </button>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="rounded-full border border-panel-frame/40 px-2.5 py-0.5 text-[0.65rem] font-bold text-depths hover:bg-white"
                >
                  Odznacz wszystkich
                </button>
                <span className="text-muted self-center text-[0.65rem]">
                  Wybrano: {selected.length} / {tutors.length}
                </span>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-app border border-panel-frame/25 bg-white p-2">
                {tutors.length === 0 ? (
                  <li className="text-muted px-1 py-2 text-sm">Brak korepetytorów w systemie.</li>
                ) : (
                  tutors.map((t) => (
                    <li key={t.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-luster/60">
                        <input
                          type="checkbox"
                          checked={selected.includes(t.id)}
                          onChange={() => toggleTutor(t.id)}
                        />
                        <span className="font-medium">{t.full_name ?? "Korepetytor"}</span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-60"
          >
            {pending ? "Wysyłanie…" : "Wyślij wiadomość"}
          </button>
          {feedback ? (
            <p className={`text-sm font-medium ${feedback.startsWith("Wysłano") ? "text-green-800" : "text-red-700"}`}>
              {feedback}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
