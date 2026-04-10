import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  // Get all uploaded files for this user
  const files = await db.collection("files").find({ userId }).sort({ category: 1, person: 1 }).toArray();

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 404 });
  }

  // Get document metadata for naming
  const documents = await db.collection("documents").find({ userId }).toArray();
  const docMap = new Map(documents.map((d) => [d.id, d]));

  const zip = new JSZip();

  // Download each file and add to ZIP
  for (const file of files) {
    try {
      const response = await fetch(file.url);
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();

      // Build folder/filename: Category/Person_DocumentName.ext
      const category = (file.category || "Other").replace(/[^a-zA-Z0-9& ]/g, "");
      const person = (file.person || "Shared").replace(/\s+/g, "");
      const doc = docMap.get(file.documentId);
      const docName = doc
        ? doc.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")
        : file.originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = file.originalName.split(".").pop() || "pdf";
      const fileName = `${person}_${docName}.${ext}`;
      const folderPath = `BrokerPack/${category}/${fileName}`;

      zip.file(folderPath, buffer);
    } catch {
      // Skip files that can't be downloaded
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="BrokerPack_${new Date().toISOString().slice(0, 10)}.zip"`,
    },
  });
}
