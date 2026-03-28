import { NextRequest, NextResponse } from "next/server";
import { put, del, list } from "@vercel/blob";
import { getDb } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const documentId = formData.get("documentId") as string;
  const category = formData.get("category") as string;
  const person = formData.get("person") as string;

  if (!file || !documentId) {
    return NextResponse.json({ error: "File and documentId required" }, { status: 400 });
  }

  // Build filename with naming convention
  const ext = file.name.split(".").pop() || "pdf";
  const datePart = new Date().toISOString().slice(0, 7).replace("-", "-");
  const safePerson = (person || "Shared").replace(/\s+/g, "");
  const safeCategory = (category || "Other").replace(/[^a-zA-Z0-9]/g, "");
  const safeDesc = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const blobName = `broker-pack/${safeCategory}/${datePart}_${safeCategory}_${safePerson}_${safeDesc}.${ext}`;

  const blob = await put(blobName, file, {
    access: "public",
    addRandomSuffix: false,
  });

  // Store file reference in MongoDB
  const db = await getDb();
  if (db) {
    await db.collection("files").insertOne({
      documentId,
      filename: blobName,
      originalName: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type,
      category,
      person,
      uploadedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    url: blob.url,
    filename: blobName,
  });
}

export async function GET(req: NextRequest) {
  const documentId = req.nextUrl.searchParams.get("documentId");

  if (documentId) {
    // Get files for a specific document
    const db = await getDb();
    if (!db) return NextResponse.json([]);
    const files = await db.collection("files").find({ documentId }).toArray();
    return NextResponse.json(files);
  }

  // List all files
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const files = await db.collection("files").find().sort({ uploadedAt: -1 }).toArray();
  return NextResponse.json(files);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { url, documentId } = body;

  if (url) {
    await del(url);
  }

  const db = await getDb();
  if (db && documentId) {
    await db.collection("files").deleteOne({ documentId, url });
  }

  return NextResponse.json({ ok: true });
}
