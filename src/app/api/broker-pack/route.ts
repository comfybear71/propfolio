import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json({ error: "No database" }, { status: 503 });

  const files = await db.collection("files").find().sort({ category: 1, person: 1 }).toArray();

  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded yet" }, { status: 404 });
  }

  // Return file list grouped by category for the broker pack
  const grouped: Record<string, { filename: string; url: string; person: string; uploadedAt: string }[]> = {};
  for (const f of files) {
    const cat = f.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({
      filename: f.originalName,
      url: f.url,
      person: f.person,
      uploadedAt: f.uploadedAt,
    });
  }

  return NextResponse.json({
    totalFiles: files.length,
    categories: grouped,
    files: files.map((f) => ({
      filename: f.originalName,
      url: f.url,
      category: f.category,
      person: f.person,
    })),
  });
}
