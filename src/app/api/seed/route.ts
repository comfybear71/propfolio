import { NextResponse } from "next/server";
import { getAuthDb } from "@/lib/apiAuth";
import { properties, loans, incomes, defaultExpenses, defaultAssets } from "@/lib/data";

export async function POST() {
  const ctx = await getAuthDb();
  if (ctx.error) return ctx.error;
  const { db, userId } = ctx;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addUserId = (items: any[]) =>
    items.map((item) => ({ ...item, userId }));

  const propCount = await db.collection("properties").countDocuments({ userId });
  if (propCount === 0) {
    await db.collection("properties").insertMany(addUserId(properties));
  }

  const loanCount = await db.collection("loans").countDocuments({ userId });
  if (loanCount === 0) {
    await db.collection("loans").insertMany(addUserId(loans));
  }

  const incomeCount = await db.collection("incomes").countDocuments({ userId });
  if (incomeCount === 0) {
    await db.collection("incomes").insertMany(addUserId(incomes));
  }

  const expenseCount = await db.collection("expenses").countDocuments({ userId });
  if (expenseCount === 0) {
    await db.collection("expenses").insertMany(addUserId(defaultExpenses));
  }

  const assetCount = await db.collection("assets").countDocuments({ userId });
  if (assetCount === 0) {
    await db.collection("assets").insertMany(addUserId(defaultAssets));
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
