import type { ReactNode } from "react";
import { AdminLayoutClient } from "@/components/admin/admin-layout-client";
import { getOpenAdminAlerts } from "@/lib/data/queries";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const alerts = await getOpenAdminAlerts();

  return <AdminLayoutClient alertCount={alerts.length}>{children}</AdminLayoutClient>;
}
