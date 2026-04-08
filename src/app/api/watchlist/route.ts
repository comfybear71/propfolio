import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const items = await db.collection("watchlist").find().sort({ updatedAt: -1 }).toArray();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  const now = new Date().toISOString();
  const item = {
    ...body,
    createdAt: body.createdAt || now,
    updatedAt: now,
  };
  // Upsert by propertyId so re-swiping updates status
  await db.collection("watchlist").updateOne(
    { propertyId: body.propertyId },
    { $set: item },
    { upsert: true }
  );
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("watchlist").updateOne(
    { id: body.id },
    { $set: { ...update, updatedAt: new Date().toISOString() } }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  await db.collection("watchlist").deleteOne({ id });
  return NextResponse.json({ ok: true });
}
