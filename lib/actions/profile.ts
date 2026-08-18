"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

const INVITE_EXPIRED =
  "Link wygasł albo jest nieprawidłowy. Poproś koordynatora o nowe zaproszenie.";

async function createAuthCookieClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Brak konfiguracji logowania.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

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

  const { syncStopTeachingAlert } = await import("@/lib/actions/alerts");
  await syncStopTeachingAlert(user.id, accepting);

  revalidatePath("/profil");
  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${user.id}`);
}

export async function setInitialPassword(password: string) {
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    throw new Error("Hasło musi mieć co najmniej 8 znaków.");
  }

  const supabase = await createAuthCookieClient();
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();
  if (sessionError || !user) throw new Error(INVITE_EXPIRED);

  const email = user.email?.trim();
  if (!email) throw new Error(INVITE_EXPIRED);

  // updateUser z sesji zaproszenia często nie zapisuje hasła do logowania.
  // Service role ustawia je na koncie na pewno — i unieważnia sesję invite.
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: trimmed,
    email_confirm: true,
  });
  if (error) throw error;

  const loginClient = await createAuthCookieClient();
  const { data: signedIn, error: signInError } = await loginClient.auth.signInWithPassword({
    email,
    password: trimmed,
  });
  if (signInError || !signedIn.session) {
    throw new Error("Hasło zapisane, ale nie udało się zalogować. Wejdź przez stronę logowania.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/panel");
}
