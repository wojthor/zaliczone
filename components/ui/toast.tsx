"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info" | "bonus";

type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
};

type ToastContextValue = {
  push: (input: Omit<ToastItem, "id">) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
  bonus: (title: string, body?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [...prev, { ...input, id }]);
      window.setTimeout(() => remove(id), input.kind === "bonus" ? 8000 : 4200);
    },
    [remove],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, body) => push({ kind: "success", title, body }),
      error: (title, body) => push({ kind: "error", title, body }),
      info: (title, body) => push({ kind: "info", title, body }),
      bonus: (title, body) => push({ kind: "bonus", title, body }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-3 z-[100] flex flex-col items-center gap-2 px-3 sm:bottom-5 sm:items-end sm:px-5"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm rounded-app border px-3 py-2.5 ${
              t.kind === "success"
                ? "border-lime/60 bg-lime text-depths"
                : t.kind === "error"
                  ? "border-steel/50 bg-mist text-depths"
                  : t.kind === "bonus"
                    ? "border-lime bg-depths text-lime"
                    : "border-panel-frame/50 bg-snow text-depths"
            }`}
            role="status"
          >
            <p className="text-sm font-bold">{t.title}</p>
            {t.body ? <p className="mt-0.5 text-xs opacity-90">{t.body}</p> : null}
            <button
              type="button"
              className="mt-1 text-[0.65rem] font-semibold underline opacity-80"
              onClick={() => remove(t.id)}
            >
              Zamknij
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className ?? ""}`}
      aria-hidden
    />
  );
}
