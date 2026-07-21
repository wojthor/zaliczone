import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminLayoutClient, SIDEBAR_COLLAPSED_COOKIE } from "@/components/admin/admin-layout-client";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return <AdminLayoutClient initialCollapsed={initialCollapsed}>{children}</AdminLayoutClient>;
}
