import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const assets = await db.collection("assets").find().toArray();
  return NextResponse.json(assets);
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  // Replace all assets at once
  await db.collection("assets").deleteMany({});
  if (body.length > 0) {
    await db.collection("assets").insertMany(body);
  }
  return NextResponse.json({ ok: true });
}
