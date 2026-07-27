"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Nauczyciel ustawia, czy przyjmuje dodatkowych uczniów. */
export async function setAcceptingStudents(accepting: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "TUTOR") throw new Error("Tylko nauczyciel może zmieniać dostępność.");

  const { error } = await supabase
    .from("profiles")
    .update({ accepting_students: accepting })
    .eq("id", user.id);

  if (error) throw error;

  revalidatePath("/profil");
  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${user.id}`);
}
