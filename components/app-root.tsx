"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";

export function AppRoot({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <LessonCompletionProvider>
      {isAdmin ? <div className="min-h-dvh bg-luster p-1.5">{children}</div> : <AppShell>{children}</AppShell>}
    </LessonCompletionProvider>
  );
}
