import { sql } from "drizzle-orm";

import { getDatabase } from "@/server/db/client";

export type DatabaseHealth =
  { latencyMs: number; status: "ok" } | { message: string; status: "error" };

/**
 * Internal-only database probe. Do not expose its error message through a public route.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = performance.now();

  try {
    await getDatabase().execute(sql`select 1`);

    return {
      latencyMs: Math.round(performance.now() - startedAt),
      status: "ok",
    };
  } catch {
    return {
      message: "Database tidak tersedia atau belum dikonfigurasi.",
      status: "error",
    };
  }
}
