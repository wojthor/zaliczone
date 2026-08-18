import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AdminLayoutClient, SIDEBAR_COLLAPSED_COOKIE } from "@/components/admin/admin-layout-client";
import { getOpenAdminAlerts } from "@/lib/data/queries";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";
  const alerts = await getOpenAdminAlerts();

  return (
    <AdminLayoutClient
      initialCollapsed={initialCollapsed}
      alertCount={alerts.length}
    >
      {children}
    </AdminLayoutClient>
  );
}
