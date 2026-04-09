import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const properties = await db.collection("discover_properties").find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();

  if (Array.isArray(body)) {
    const properties = body.map((p) => ({ ...p, userId, createdAt: p.createdAt || new Date().toISOString() }));
    if (properties.length > 0) {
      await db.collection("discover_properties").insertMany(properties);
    }
    return NextResponse.json({ ok: true, count: properties.length });
  }

  await db.collection("discover_properties").insertOne({
    ...body, userId, createdAt: body.createdAt || new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("discover_properties").updateOne(
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
  await db.collection("discover_properties").deleteOne({ id, userId });
  return NextResponse.json({ ok: true });
}
