import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const expenses = await db.collection("expenses").find().toArray();
  return NextResponse.json(expenses);
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  await db.collection("expenses").deleteMany({});
  if (body.length > 0) {
    await db.collection("expenses").insertMany(body);
  }
  return NextResponse.json({ ok: true });
}
