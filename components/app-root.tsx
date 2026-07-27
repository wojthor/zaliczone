"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";
import { ToastProvider } from "@/components/ui/toast";

function isPrintDocumentPath(pathname: string): boolean {
  return (
    pathname.startsWith("/finanse/ewidencja") ||
    pathname.startsWith("/admin/ksiegowosc/ewidencja") ||
    pathname.startsWith("/admin/ksiegowosc/koszty") ||
    pathname.startsWith("/admin/wyplaty/lista-plac")
  );
}

export function AppRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isAdmin = pathname.startsWith("/admin");
  const isPrintDoc = isPrintDocumentPath(pathname);

  if (isLogin || isPrintDoc) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ToastProvider>
      <LessonCompletionProvider>
        {isAdmin ? (
          <div className="min-h-dvh bg-paper p-1.5">{children}</div>
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </LessonCompletionProvider>
    </ToastProvider>
  );
}
