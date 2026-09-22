import { describe, expect, it, vi } from "vitest";
import {
  findIdentitySuggestions,
  identityDistance,
  rankIdentitySuggestions,
} from "@/server/aspirations/identity-search";
import {
  listReportQueue,
  parseReportQueueQuery,
} from "@/server/aspirations/case-management";
import type { Database } from "@/server/db/client";
import { PgDialect } from "drizzle-orm/pg-core";

const candidate = {
  id: "test-report",
  name: "Mikael Sintetis",
  nim: "25111500427",
  title: "Fasilitas uji",
  status: "UNDER_REVIEW" as const,
  archived: false,
};
function recorder(...results: unknown[]) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const limits: number[] = [];
  const offsets: number[] = [];
  const select = vi.fn(() => {
    const result = results.shift() ?? [];
    const node: Record<string, unknown> = {};
    for (const key of ["from", "leftJoin", "innerJoin", "orderBy"])
      node[key] = () => node;
    node.where = (condition: never) => {
      queries.push(new PgDialect().sqlToQuery(condition));
      return node;
    };
    node.limit = (value: number) => {
      limits.push(value);
      return node;
    };
    node.offset = (value: number) => {
      offsets.push(value);
      return node;
    };
    node.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve);
    return node;
  });
  return {
    database: { select } as unknown as Database,
    queries,
    limits,
    offsets,
    select,
  };
}
describe("identity typo suggestions", () => {
  it("finds an extra digit without rewriting identity or treating it as exact", () => {
    const input = { ...candidate };
    expect(rankIdentitySuggestions("2511500427", [input])).toEqual([
      { ...candidate, matchedBy: "nim" },
    ]);
    expect(input.nim).toBe("25111500427");
  });
  it.each(["251150042", "2511500428", "2511500472"])(
    "finds one missing, replaced or swapped digit: %s",
    (search) => {
      expect(
        rankIdentitySuggestions(search, [{ ...candidate, nim: "2511500427" }]),
      ).toHaveLength(1);
    },
  );
  it("rejects unrelated identifiers and short broad searches", () => {
    expect(rankIdentitySuggestions("9999999999", [candidate])).toEqual([]);
    expect(rankIdentitySuggestions("042", [candidate])).toEqual([]);
    expect(rankIdentitySuggestions("Mi", [candidate])).toEqual([]);
  });
  it("handles deletion plus adjacent transposition in a name", () => {
    expect(identityDistance("mikatanael", "mikantael")).toBe(2);
    expect(
      rankIdentitySuggestions("Mikatanael", [
        { ...candidate, name: "Mikantael Sintetis" },
      ]),
    ).toHaveLength(1);
    expect(
      rankIdentitySuggestions("Sintetis Mikatanael", [
        { ...candidate, name: "Mikantael Sintetis" },
      ]),
    ).toHaveLength(1);
    expect(
      rankIdentitySuggestions("Nama Tidakberhubungan", [candidate]),
    ).toHaveLength(0);
  });
  it("finds a report after 300 candidates instead of searching only the visible page", async () => {
    const rows = Array.from({ length: 300 }, (_, i) => ({
      ...candidate,
      id: `noise-${i}`,
      name: "Miki Contoh",
      nim: "9999999999",
      archivedAt: null,
    }));
    rows.push({
      ...candidate,
      id: "target-after-300",
      name: "Mikantael Sintetis",
      archivedAt: null,
    });
    const r = recorder([{ value: 0 }], [], rows);
    const result = await listReportQueue(
      parseReportQueueQuery(
        new URLSearchParams({
          search: "Mikatanael",
          status: "UNDER_REVIEW",
          fromDate: "2026-09-01",
        }),
      ),
      r.database,
      { includeRestricted: true, includeSuggestions: true },
    );
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.suggestions?.items.map((item) => item.id)).toEqual([
      "target-after-300",
    ]);
    expect(r.limits).toEqual([25, 1001]);
    expect(r.offsets).toEqual([0]);
    expect(r.queries[2].sql).toContain(
      '"aspiration_reports"."archived_at" is null',
    );
    expect(r.queries[2].sql).toContain(
      '"aspiration_reports"."submitted_at" >=',
    );
    expect(r.queries[2].params).toContain("UNDER_REVIEW");
    expect(r.queries[2].sql).not.toContain("Mikatanael");
  });
  it("does not issue the private fallback without permission or during export", async () => {
    for (const options of [
      { includeSuggestions: true },
      { includeRestricted: true },
    ]) {
      const r = recorder([{ value: 0 }], []);
      const result = await listReportQueue(
        parseReportQueueQuery(new URLSearchParams({ search: "Mikatanael" })),
        r.database,
        options,
      );
      expect(r.select).toHaveBeenCalledTimes(2);
      expect(result.suggestions).toBeUndefined();
    }
  });
  it("does not replace a normal exact search with fuzzy results", async () => {
    const r = recorder([{ value: 1 }], []);
    const result = await listReportQueue(
      parseReportQueueQuery(new URLSearchParams({ search: "Mikatanael" })),
      r.database,
      { includeRestricted: true, includeSuggestions: true },
    );
    expect(r.select).toHaveBeenCalledTimes(2);
    expect(result.suggestions).toBeUndefined();
  });
  it("binds one-edit NIM patterns in SQL without depending on an extension", async () => {
    const r = recorder([{ ...candidate, archivedAt: null }]);
    const result = await findIdentitySuggestions(
      "2511500427",
      undefined,
      r.database,
    );
    expect(r.queries[0].params).toContain("251_1500427");
    expect(r.queries[0].params).toContain("2511500472");
    expect(r.queries[0].sql).not.toContain("2511500427");
    expect(result.items[0]?.id).toBe(candidate.id);
  });
  it("exposes the bounded scan instead of silently claiming exhaustive results", async () => {
    const r = recorder(
      Array.from({ length: 1001 }, (_, i) => ({
        ...candidate,
        id: `test-${i}`,
        archivedAt: null,
      })),
    );
    const result = await findIdentitySuggestions(
      "Mikael",
      undefined,
      r.database,
    );
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(10);
    expect(result.totalMatches).toBe(1000);
  });
});
