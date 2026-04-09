import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const documents = await db.collection("documents").find({ userId }).toArray();
  return NextResponse.json(documents);
}

export async function PUT(req: NextRequest) {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;
  const body = await req.json();
  await db.collection("documents").deleteMany({ userId });
  if (body.length > 0) {
    await db.collection("documents").insertMany(body.map((d: Record<string, unknown>) => ({ ...d, userId })));
  }
  return NextResponse.json({ ok: true });
}
