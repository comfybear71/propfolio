import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const loans = await db.collection("loans").find({ userId }).toArray();
  return NextResponse.json(loans);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("loans").updateOne(
    { id: body.id, userId },
    { $set: { ...update, userId } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
