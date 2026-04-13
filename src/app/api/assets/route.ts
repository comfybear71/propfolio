import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const assets = await db.collection("assets").find({ userId }).toArray();
  return NextResponse.json(assets);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  await db.collection("assets").deleteMany({ userId });
  if (body.length > 0) {
    await db.collection("assets").insertMany(body.map((a: Record<string, unknown>) => ({ ...a, userId })));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  await db.collection("assets").deleteOne({ id, userId });
  return NextResponse.json({ ok: true });
}
