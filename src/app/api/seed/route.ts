import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { properties, loans, incomes, defaultExpenses, defaultAssets } from "@/lib/data";

export async function POST() {
  const db = await getDb();
  if (!db) return NextResponse.json({ ok: false, error: "No database connection" }, { status: 503 });

  const propCount = await db.collection("properties").countDocuments();
  if (propCount === 0) {
    await db.collection("properties").insertMany(properties.map((p) => ({ ...p })));
  }

  const loanCount = await db.collection("loans").countDocuments();
  if (loanCount === 0) {
    await db.collection("loans").insertMany(loans.map((l) => ({ ...l })));
  }

  const incomeCount = await db.collection("incomes").countDocuments();
  if (incomeCount === 0) {
    await db.collection("incomes").insertMany(incomes.map((i) => ({ ...i })));
  }

  const expenseCount = await db.collection("expenses").countDocuments();
  if (expenseCount === 0) {
    await db.collection("expenses").insertMany(defaultExpenses.map((e) => ({ ...e })));
  }

  const assetCount = await db.collection("assets").countDocuments();
  if (assetCount === 0) {
    await db.collection("assets").insertMany(defaultAssets.map((a) => ({ ...a })));
  }

  return NextResponse.json({
    ok: true,
    seeded: {
      properties: propCount === 0 ? properties.length : "already existed",
      loans: loanCount === 0 ? loans.length : "already existed",
      incomes: incomeCount === 0 ? incomes.length : "already existed",
      expenses: expenseCount === 0 ? defaultExpenses.length : "already existed",
      assets: assetCount === 0 ? defaultAssets.length : "already existed",
    },
  });
}
