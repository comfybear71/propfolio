import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

// Proxy endpoint for private Vercel Blob files
// Usage: GET /api/files/download?url=<encoded-blob-url>
export async function GET(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Verify this file belongs to the authenticated user
  const file = await db.collection("files").findOne({ url: blobUrl, userId });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Blob fetch failed: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || file.contentType || "application/octet-stream";
    const blob = await response.arrayBuffer();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${file.originalName || "file"}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Download failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
