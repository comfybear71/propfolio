import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const settings = await db.collection("strategy_settings").findOne({ userId });
  return NextResponse.json(settings || {});
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("strategy_settings").updateOne(
    { userId },
    { $set: { ...update, userId, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
