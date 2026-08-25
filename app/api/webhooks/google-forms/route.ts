import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseRequiredTests, parseTestResults } from "@/lib/recruitment/test-links";
import type { CandidateStatus } from "@/lib/types/database";

export const runtime = "nodejs";

const OPEN_STATUSES: CandidateStatus[] = ["NEW", "IN_PROGRESS"];

function assertWebhookSecret(req: Request): boolean {
  const secret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  const header =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return header === secret;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1" || s === "tak" || s === "yes";
  }
  return false;
}

function asText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function unwrapData(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...body, ...(data as Record<string, unknown>) };
  }
  return body;
}

function parseDob(v: unknown): string | null {
  const s = asText(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  return null;
}

export async function POST(req: Request) {
  if (!assertWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = String(raw.type ?? "").toUpperCase();
  if (type !== "APPLICATION" && type !== "TEST_RESULT") {
    return NextResponse.json(
      { error: 'Missing or invalid type. Use "APPLICATION" or "TEST_RESULT".' },
      { status: 400 },
    );
  }

  const body = unwrapData(raw);
  const supabase = createServiceClient();

  try {
    if (type === "APPLICATION") {
      const email = normalizeEmail(String(body.email ?? ""));
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
      }

      let fullName = asText(body.full_name) ?? asText(body.fullName) ?? null;
      if (!fullName) {
        const joined = [
          asText(body.first_name) ?? asText(body.firstName),
          asText(body.last_name) ?? asText(body.lastName),
        ]
          .filter(Boolean)
          .join(" ");
        fullName = joined || null;
      }
      if (!fullName) {
        return NextResponse.json({ error: "full_name is required" }, { status: 400 });
      }

      const requiredTests = parseRequiredTests(body.required_tests ?? body.requiredTests);
      if (requiredTests.length === 0) {
        return NextResponse.json(
          { error: "required_tests must be a non-empty array of { subject, level }" },
          { status: 400 },
        );
      }

      const row = {
        full_name: fullName,
        email,
        phone: asText(body.phone),
        dob: parseDob(body.dob ?? body.date_of_birth ?? body.birth_date),
        student_status: asBool(body.student_status ?? body.studentStatus),
        university: asText(body.university),
        experience: asBool(body.experience),
        required_tests: requiredTests,
        levels: asText(body.levels),
        hours_per_week: asText(body.hours_per_week ?? body.hoursPerWeek),
        cv_url: asText(body.cv_url ?? body.cvUrl),
        tests_expected: requiredTests.length,
        tests_completed: 0,
        test_results: {},
        test_sent_manually: false,
        status: "NEW" as const,
      };

      const { data: existing } = await supabase
        .from("candidates")
        .select("id, status")
        .ilike("email", email)
        .in("status", OPEN_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("candidates")
          .update({
            full_name: row.full_name,
            phone: row.phone,
            dob: row.dob,
            student_status: row.student_status,
            university: row.university,
            experience: row.experience,
            required_tests: row.required_tests,
            levels: row.levels,
            hours_per_week: row.hours_per_week,
            cv_url: row.cv_url,
            tests_expected: row.tests_expected,
          })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        return NextResponse.json({ ok: true, action: "updated", candidate: data });
      }

      const { data, error } = await supabase.from("candidates").insert(row).select("*").single();
      if (error) throw error;
      return NextResponse.json({ ok: true, action: "created", candidate: data }, { status: 201 });
    }

    // TEST_RESULT
    const email = normalizeEmail(String(body.email ?? ""));
    const subject = asText(body.subject) ?? asText(body.test_subject);
    const level = asText(body.level) ?? asText(body.test_level) ?? "";
    const score = asText(body.score) ?? asText(body.test_score) ?? asText(body.testScore);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }
    if (!subject) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    if (!score) {
      return NextResponse.json({ error: "score is required" }, { status: 400 });
    }

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, status, test_results, tests_completed")
      .ilike("email", email)
      .in("status", ["NEW", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found for email" }, { status: 404 });
    }

    const prev = parseTestResults(candidate.test_results);
    const hadScore = Boolean(prev[subject]?.score);
    const nextResults = {
      ...prev,
      [subject]: { score, level },
    };
    const testsCompleted = hadScore
      ? Number(candidate.tests_completed) || Object.keys(nextResults).length
      : (Number(candidate.tests_completed) || 0) + 1;

    const { data, error } = await supabase
      .from("candidates")
      .update({
        test_results: nextResults,
        tests_completed: testsCompleted,
        status: "IN_PROGRESS",
      })
      .eq("id", candidate.id)
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, action: "test_result", candidate: data });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String((e as { message: unknown }).message)
          : "Webhook failed";
    console.error("[webhooks/google-forms]", e);
    if (
      message.includes("candidates") ||
      message.includes("schema cache") ||
      message.includes("required_tests")
    ) {
      return NextResponse.json(
        {
          error:
            "Schemat candidates jest stary — w SQL Editor uruchom upgrade z supabase/migrations/0018_candidates.sql (kolumna required_tests zamiast subjects).",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
