import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const expenses = await db.collection("expenses").find({ userId }).toArray();
  return NextResponse.json(expenses);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  await db.collection("expenses").deleteMany({ userId });
  if (body.length > 0) {
    await db.collection("expenses").insertMany(body.map((e: Record<string, unknown>) => ({ ...e, userId })));
  }
  return NextResponse.json({ ok: true });
}
