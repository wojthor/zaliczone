import { CennikClient } from "./cennik-client";
import { getPriceTiers, getSubjectRequests } from "@/lib/data/queries";

export default async function AdminCennikPage() {
  const [pendingRequests, priceTiers] = await Promise.all([
    getSubjectRequests("PENDING"),
    getPriceTiers(),
  ]);
  return <CennikClient pendingRequests={pendingRequests} initialTiers={priceTiers} />;
}
