import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const files = await db.collection("files").find({ userId }).sort({ category: 1, person: 1 }).toArray();

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
