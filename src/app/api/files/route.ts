import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getAuthDb } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const documentId = formData.get("documentId") as string;
  const category = formData.get("category") as string;
  const person = formData.get("person") as string;

  if (!file || !documentId) {
    return NextResponse.json({ error: "File and documentId required" }, { status: 400 });
  }

  try {
    const ext = file.name.split(".").pop() || "pdf";
    const datePart = new Date().toISOString().slice(0, 7).replace("-", "-");
    const safePerson = (person || "Shared").replace(/\s+/g, "");
    const safeCategory = (category || "Other").replace(/[^a-zA-Z0-9]/g, "");
    const safeDesc = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const blobName = `broker-pack/${safeCategory}/${datePart}_${safeCategory}_${safePerson}_${safeDesc}.${ext}`;

    const blob = await put(blobName, file, { access: "public", addRandomSuffix: false });

    await db.collection("files").insertOne({
      documentId,
      filename: blobName,
      originalName: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type,
      category,
      person,
      userId,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, url: blob.url, filename: blobName });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `File upload failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const documentId = req.nextUrl.searchParams.get("documentId");
  const filter = documentId ? { documentId, userId } : { userId };
  const files = await db.collection("files").find(filter).sort({ uploadedAt: -1 }).toArray();
  return NextResponse.json(files);
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const body = await req.json();
  const { url, documentId } = body;

  if (url) await del(url);
  if (documentId) {
    await db.collection("files").deleteOne({ documentId, url, userId });
  }
  return NextResponse.json({ ok: true });
}
