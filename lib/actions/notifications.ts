"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TAG, bustTag, notificationsTag } from "@/lib/cache";

function revalidateNotificationViews() {
  revalidatePath("/powiadomienia");
  revalidatePath("/panel");
  revalidatePath("/finanse");
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) throw new Error("Brak profilu.");
  return { user, role: profile.role as "ADMIN" | "TUTOR" };
}

export async function markNotificationRead(id: string) {
  const { user, role } = await requireUser();
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (role === "TUTOR") {
    query = query.eq("tutor_id", user.id).eq("audience", "TUTOR");
  } else {
    query = query.eq("audience", "ADMIN");
  }
  const { error } = await query;
  if (error) throw error;
  if (role === "TUTOR") bustTag(notificationsTag(user.id));
  else bustTag(TAG.notifications);
  revalidateNotificationViews();
}
