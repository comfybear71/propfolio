import { NextResponse } from "next/server";
import { auth } from "./auth";
import { getDb } from "./mongodb";
import type { Db } from "mongodb";

/**
 * Get authenticated DB context for API routes.
 * Returns { db, userId } or a 401 response if not authenticated.
 */
export async function getAuthDb(): Promise<
  { db: Db; userId: string; error?: never } | { error: NextResponse; db?: never; userId?: never }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const db = await getDb();
  if (!db) {
    return { error: NextResponse.json({ error: "No database" }, { status: 503 }) };
  }

  return { db, userId: session.user.id };
}
