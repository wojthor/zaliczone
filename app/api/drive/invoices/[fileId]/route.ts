import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDriveClient, isInvoicesDriveConfigured } from "@/lib/google-drive/client";
import { assertInvoiceDriveFile } from "@/lib/google-drive/invoice-folders";

export const runtime = "nodejs";

/** Strumieniuje fakturę / rachunek z folderu Faktury (tylko ADMIN). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  if (!isInvoicesDriveConfigured()) {
    return NextResponse.json({ error: "Folder Faktury nie jest skonfigurowany" }, { status: 503 });
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const meta = await assertInvoiceDriveFile(fileId);
    if (meta.mimeType === "application/vnd.google-apps.folder") {
      return NextResponse.json({ error: "To jest folder" }, { status: 400 });
    }

    const { drive } = getDriveClient();
    const disposition =
      request.nextUrl.searchParams.get("disposition") === "inline" ? "inline" : "attachment";

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
