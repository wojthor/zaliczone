import { redirect } from "next/navigation";

/** Zakładka Premie usunięta — paski premii są w Nauczyciele. */
export default function AdminPremiePage() {
  redirect("/admin/nauczyciele");
}
