import { describe, expect, it, vi } from "vitest";
import {
  listReportQueue,
  parseReportQueueQuery,
} from "@/server/aspirations/case-management";
import type { Database } from "@/server/db/client";
import { PgDialect } from "drizzle-orm/pg-core";

function recorder() {
  const queries: { sql: string; params: unknown[] }[] = [];
  const results: unknown[] = [[{ value: 0 }], []];
  const database = {
    select: vi.fn(() => {
      const result = results.shift();
      const node: Record<string, unknown> = {};
      for (const key of [
        "from",
        "leftJoin",
        "innerJoin",
        "orderBy",
        "limit",
        "offset",
      ])
        node[key] = () => node;
      node.where = (condition: never) => {
        queries.push(new PgDialect().sqlToQuery(condition));
        return node;
      };
      node.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve);
      return node;
    }),
  } as unknown as Database;
  return { database, queries };
}

describe("private admin search SQL", () => {
  it("matches every word across authorized identity fields in both rows and count queries", async () => {
    const parsed = parseReportQueueQuery(
      new URLSearchParams({ search: "  Sintetis   Mahasiswa  " }),
    );
    expect(parsed.search).toBe("Sintetis Mahasiswa");
    const { database, queries } = recorder();
    await listReportQueue(parsed, database, { includeRestricted: true });
    expect(queries).toHaveLength(2);
    for (const query of queries) {
      for (const field of ["name", "nim", "email"])
        expect(query.sql).toContain(`"reporter_identities"."${field}" ilike`);
      expect(query.sql).toContain(") and (");
      expect(query.params.filter((p) => p === "%Sintetis%")).toHaveLength(6);
      expect(query.params.filter((p) => p === "%Mahasiswa%")).toHaveLength(6);
      expect(query.sql).not.toContain("Sintetis");
    }
  });
  it("never searches identity fields without confidential permission", async () => {
    const { database, queries } = recorder();
    await listReportQueue(
      parseReportQueueQuery(new URLSearchParams({ search: "Mahasiswa" })),
      database,
    );
    for (const query of queries)
      expect(query.sql).not.toContain('"reporter_identities"');
  });
  it("preserves NIM digits and leading zeros without fuzzy matching", async () => {
    const { database, queries } = recorder();
    await listReportQueue(
      parseReportQueueQuery(new URLSearchParams({ search: "00123456789" })),
      database,
      { includeRestricted: true },
    );
    for (const query of queries)
      expect(query.params).toEqual(Array(6).fill("%00123456789%"));
  });
  it("treats LIKE wildcard characters as literal input", async () => {
    const { database, queries } = recorder();
    await listReportQueue(
      parseReportQueueQuery(new URLSearchParams({ search: "50%_" })),
      database,
      { includeRestricted: true },
    );
    for (const query of queries)
      expect(query.params).toEqual(Array(6).fill("%50\\%\\_%"));
  });
});
