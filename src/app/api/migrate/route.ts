import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";

/**
 * POST /api/migrate
 * Claims all existing documents (without a userId) and assigns them to the current user.
 * Run this once after your first login to keep your existing data.
 */
export async function POST() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  const collections = [
    "properties",
    "loans",
    "incomes",
    "expenses",
    "assets",
    "documents",
    "files",
    "watchlist",
    "discover_properties",
  ];

  const results: Record<string, number> = {};

  for (const name of collections) {
    const result = await db.collection(name).updateMany(
      { userId: { $exists: false } },
      { $set: { userId } }
    );
    results[name] = result.modifiedCount;
  }

  return NextResponse.json({ ok: true, migrated: results, userId });
}
