import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json([]);
  const properties = await db.collection("discover_properties").find().sort({ createdAt: -1 }).toArray();
  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();

  // Support bulk import (array) or single property
  if (Array.isArray(body)) {
    const properties = body.map((p) => ({
      ...p,
      createdAt: p.createdAt || new Date().toISOString(),
    }));
    if (properties.length > 0) {
      await db.collection("discover_properties").insertMany(properties);
    }
    return NextResponse.json({ ok: true, count: properties.length });
  }

  const property = {
    ...body,
    createdAt: body.createdAt || new Date().toISOString(),
  };
  await db.collection("discover_properties").insertOne(property);
  return NextResponse.json({ ok: true, property });
}

export async function PUT(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const body = await req.json();
  const { _id, ...update } = body;
  void _id;
  await db.collection("discover_properties").updateOne(
    { id: body.id },
    { $set: update },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database" }, { status: 503 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  await db.collection("discover_properties").deleteOne({ id });
  return NextResponse.json({ ok: true });
}
