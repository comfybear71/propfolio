import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

// GET /api/share/data?token=... — public read-only portfolio data by share token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
  }

  const db = await getDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }

  // Look up the share record
  const share = await db.collection("shares").findOne({ token });
  if (!share) {
    return NextResponse.json({ ok: false, error: "Invalid or revoked share link" }, { status: 404 });
  }

  const userId = share.userId;

  // Fetch all data for this user (read-only, broker-relevant)
  const [properties, loans, incomes, expenses, assets, files] = await Promise.all([
    db.collection("properties").find({ userId }).toArray(),
    db.collection("loans").find({ userId }).toArray(),
    db.collection("incomes").find({ userId }).toArray(),
    db.collection("expenses").find({ userId }).toArray(),
    db.collection("assets").find({ userId }).toArray(),
    db.collection("files").find({ userId }).project({ url: 0 }).toArray(), // hide actual URLs, just show metadata
  ]);

  // Strip MongoDB _id fields
  const clean = <T extends Record<string, unknown>>(arr: T[]) => arr.map(({ _id, userId, ...rest }) => { void _id; void userId; return rest; });

  return NextResponse.json({
    ok: true,
    sharedAt: share.createdAt,
    data: {
      properties: clean(properties),
      loans: clean(loans),
      incomes: clean(incomes),
      expenses: clean(expenses),
      assets: clean(assets),
      files: clean(files),
    },
  });
}
