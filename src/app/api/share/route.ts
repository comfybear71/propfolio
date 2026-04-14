import { NextRequest, NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";
import crypto from "crypto";

// POST /api/share — create or rotate share token for the current user
export async function POST() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const token = crypto.randomBytes(24).toString("hex");

  await db.collection("shares").updateOne(
    { userId },
    {
      $set: {
        userId,
        token,
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, token });
}

// GET /api/share — get current share token for the user
export async function GET() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const share = await db.collection("shares").findOne({ userId });
  if (!share) return NextResponse.json({ ok: true, token: null });
  return NextResponse.json({ ok: true, token: share.token, createdAt: share.createdAt });
}

// DELETE /api/share — revoke share token
export async function DELETE() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  await db.collection("shares").deleteOne({ userId });
  return NextResponse.json({ ok: true });
}
