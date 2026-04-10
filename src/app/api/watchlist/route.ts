import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const items = await db.collection("watchlist").find({ userId }).sort({ updatedAt: -1 }).toArray();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  const now = new Date().toISOString();
  const item = { ...body, userId, createdAt: body.createdAt || now, updatedAt: now };
  await db.collection("watchlist").updateOne(
    { propertyId: body.propertyId, userId },
    { $set: item },
    { upsert: true }
  );
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("watchlist").updateOne(
    { id: body.id, userId },
    { $set: { ...update, updatedAt: new Date().toISOString() } }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  await db.collection("watchlist").deleteOne({ id, userId });
  return NextResponse.json({ ok: true });
}
