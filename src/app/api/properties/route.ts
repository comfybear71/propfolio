import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const properties = await db.collection("properties").find({ userId }).toArray();
  return NextResponse.json(properties);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("properties").updateOne(
    { id: body.id, userId },
    { $set: { ...update, userId } },
    { upsert: true }
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
  // Delete property and its associated loan
  await db.collection("properties").deleteOne({ id, userId });
  await db.collection("loans").deleteMany({ propertyId: id, userId });
  return NextResponse.json({ ok: true });
}
