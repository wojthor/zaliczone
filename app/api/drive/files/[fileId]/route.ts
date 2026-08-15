import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, isDriveConfigured } from "@/lib/google-drive/client";
import { assertFileInFolder } from "@/lib/google-drive/tutor-folders";

export const runtime = "nodejs";

/**
 * Strumieniuje plik z Google Drive.
 * TUTOR — tylko pliki ze swojego folderu.
 * ADMIN — pliki z folderu dowolnego nauczyciela (query tutorId) lub własnego sprawdzenia parents.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Drive nie skonfigurowany" }, { status: 503 });
  }

  const { fileId } = await context.params;
  if (!fileId) {
    return NextResponse.json({ error: "Brak fileId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, drive_folder_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Brak profilu" }, { status: 403 });
  }

  const tutorIdParam = request.nextUrl.searchParams.get("tutorId");
  let folderId: string | null = null;

  if (profile.role === "TUTOR") {
    folderId = (profile.drive_folder_id as string | null) ?? null;
  } else if (profile.role === "ADMIN") {
    const targetTutorId = tutorIdParam ?? null;
    if (!targetTutorId) {
      return NextResponse.json({ error: "Podaj tutorId" }, { status: 400 });
    }
    const { data: tutor } = await supabase
      .from("profiles")
      .select("drive_folder_id")
      .eq("id", targetTutorId)
      .maybeSingle();
    folderId = (tutor?.drive_folder_id as string | null) ?? null;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!folderId) {
    return NextResponse.json({ error: "Brak folderu Drive" }, { status: 404 });
  }

  try {
    const meta = await assertFileInFolder(fileId, folderId);
    if (meta.mimeType === "application/vnd.google-apps.folder") {
      return NextResponse.json({ error: "To jest folder" }, { status: 400 });
    }

    const { drive } = getDriveClient();
    const disposition =
      request.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

    // Google Docs native types — eksport do PDF
    const googleNative = meta.mimeType.startsWith("application/vnd.google-apps.");
    let nodeStream: Readable;
    let contentType = meta.mimeType;
    let filename = meta.name;

    if (googleNative && meta.mimeType !== "application/vnd.google-apps.folder") {
      const exportMime = "application/pdf";
      const exported = await drive.files.export(
        { fileId, mimeType: exportMime },
        { responseType: "stream" },
      );
      nodeStream = exported.data as Readable;
      contentType = exportMime;
      if (!filename.toLowerCase().endsWith(".pdf")) filename = `${filename}.pdf`;
    } else {
      const downloaded = await drive.files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "stream" },
      );
      nodeStream = downloaded.data as Readable;
    }

    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(webStream, { status: 200, headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Błąd pobierania";
    const status = message.includes("Brak dostępu") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
