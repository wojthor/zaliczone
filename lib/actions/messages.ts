"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { MESSAGE_TEMPLATES, type ComposeTemplateKey } from "@/lib/message-templates";
import type { MessageCategory, MessageTemplate } from "@/lib/types/messages";

async function resolveRecipientIds(all: boolean, selectedIds: string[]): Promise<string[]> {
  if (!all) return selectedIds;
  const supabase = createServiceClient();
  const { data } = await supabase.from("profiles").select("id").eq("role", "TUTOR");
  return (data ?? []).map((r) => r.id);
}

export async function createInAppMessages(input: {
  title: string;
  body: string;
  category: MessageCategory;
  template: MessageTemplate;
  recipientIds: string[];
  senderId?: string | null;
}) {
  if (input.recipientIds.length === 0) return { count: 0 };

  const supabase = createServiceClient();
  const { data: msg, error } = await supabase
    .from("admin_messages")
    .insert({
      sender_id: input.senderId ?? null,
      title: input.title,
      body: input.body,
      category: input.category,
      template: input.template,
    })
    .select("id")
    .single();

  if (error || !msg) throw error ?? new Error("Nie udało się utworzyć wiadomości.");

  const rows = input.recipientIds.map((recipient_id) => ({
    message_id: msg.id,
    recipient_id,
  }));

  const { error: recErr } = await supabase.from("message_recipients").insert(rows);
  if (recErr) throw recErr;

  revalidatePath("/admin/powiadomienia");
  revalidatePath("/powiadomienia");
  return { count: input.recipientIds.length };
}

export async function sendAdminBroadcast(input: {
  template: ComposeTemplateKey;
  title?: string;
  body?: string;
  sendToAll: boolean;
  recipientIds: string[];
  monthLabel?: string;
  /** YYYY-MM — odblokowuje ewidencję przy szablonie EWIDENCJA */
  monthKey?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji admina.");

  const recipientIds = await resolveRecipientIds(input.sendToAll, input.recipientIds);
  if (recipientIds.length === 0) throw new Error("Wybierz co najmniej jednego odbiorcę.");

  let title: string;
  let body: string;
  let category: MessageCategory;
  let template: MessageTemplate;

  if (input.template === "CUSTOM") {
    title = input.title?.trim() ?? "";
    body = input.body?.trim() ?? "";
    if (!title || !body) throw new Error("Tytuł i treść są wymagane.");
    category = "employer";
    template = "CUSTOM";
  } else {
    const preset = MESSAGE_TEMPLATES[input.template];
    const defaultTitle =
      input.monthLabel && input.template === "EWIDENCJA"
        ? `${preset.title} — ${input.monthLabel}`
        : preset.title;
    title = input.title?.trim() || defaultTitle;
    body = input.body?.trim() || preset.body;
    category = preset.category;
    template = preset.template;
  }

  const result = await createInAppMessages({
    title,
    body,
    category,
    template,
    recipientIds,
    senderId: user.id,
  });

  // Szablon EWIDENCJA odblokowuje miesiąc ewidencji u odbiorców
  if (input.template === "EWIDENCJA" && input.monthKey && /^\d{4}-\d{2}$/.test(input.monthKey)) {
    const admin = createServiceClient();
    for (const id of recipientIds) {
      await admin
        .from("profiles")
        .update({ ewidencja_unlocked_for_month: input.monthKey })
        .eq("id", id);
    }
    revalidatePath("/finanse");
    revalidatePath("/profil");
    revalidatePath("/admin/wyplaty");
  }

  return result;
}

export async function markInboxMessageRead(recipientRowId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("message_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("id", recipientRowId);

  if (error) throw error;
  revalidatePath("/powiadomienia");
}

export async function markAllInboxRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("message_recipients")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .eq("recipient_id", user.id);

  if (error) throw error;
  revalidatePath("/powiadomienia");
}

export async function getTutorStudentsForAdmin(tutorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, class_level, subjects, rate_pln")
    .eq("tutor_id", tutorId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}
