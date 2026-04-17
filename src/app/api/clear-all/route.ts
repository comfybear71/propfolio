import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

// DELETE /api/clear-all — wipes all user data (for testing / fresh start)
export async function DELETE() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  await Promise.all([
    db.collection("properties").deleteMany({ userId }),
    db.collection("loans").deleteMany({ userId }),
    db.collection("incomes").deleteMany({ userId }),
    db.collection("expenses").deleteMany({ userId }),
    db.collection("assets").deleteMany({ userId }),
    db.collection("borrowing_settings").deleteMany({ userId }),
    db.collection("strategy_settings").deleteMany({ userId }),
    db.collection("shares").deleteMany({ userId }),
  ]);

  return NextResponse.json({ ok: true });
}
