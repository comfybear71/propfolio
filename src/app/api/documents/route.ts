import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const documents = await db.collection("documents").find().toArray();
  return NextResponse.json(documents);
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  await db.collection("documents").deleteMany({});
  if (body.length > 0) {
    await db.collection("documents").insertMany(body);
  }
  return NextResponse.json({ ok: true });
}
