import { auth } from "./auth";

/**
 * Get the current authenticated user's ID from the session.
 * Returns null if not authenticated.
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
