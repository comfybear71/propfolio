import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const properties = await db.collection("properties").find().toArray();
  return NextResponse.json(properties);
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  const { _id, ...update } = body;
  await db.collection("properties").updateOne(
    { id: body.id },
    { $set: update },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
