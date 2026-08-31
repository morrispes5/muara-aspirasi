import { describe, expect, it, vi } from "vitest";

import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  getPublishedContent,
  listPublishedContent,
} from "@/server/content/publication";
import { type Database } from "@/server/db/client";

/**
 * These tests assert on the SQL the public read paths actually build, not on
 * rows a stub happens to return. A stub that hands back whatever the test fed
 * it can only prove the stub; rendering the real `where` clause through the
 * Postgres dialect proves the query itself, so a regression that drops the
 * PUBLISHED filter or joins a private table fails here.
 */
const dialect = new PgDialect();

/**
 * Every table holding reporter-owned or BEM-internal data. `SECURITY_PRIVACY.md`
 * section 5 forbids all of it from reaching a public route: original reports,
 * identity, evidence, internal notes, assignments, audit, and the update-to-report
 * linkage that would let a reader correlate a public update with a private case.
 */
const privateTables = [
  "advocacy_update_reports",
  "aspiration_reports",
  "audit_events",
  "auth_accounts",
  "auth_sessions",
  "bem_users",
  "internal_notes",
  "report_assignments",
  "report_evidence",
  "report_status_events",
  "reporter_identities",
];

type Recorded = {
  database: Database;
  params: unknown[][];
  tables: string[];
  wheres: string[];
};

function recordingDatabase(...results: unknown[]): Recorded {
  const tables: string[] = [];
  const wheres: string[] = [];
  const params: unknown[][] = [];
  const queue = [...results];

  function chain(result: unknown) {
    const node: Record<string, unknown> = {};
    const capture = (table: never) => {
      tables.push(getTableName(table));
      return node;
    };
    node.from = capture;
    node.innerJoin = capture;
    node.leftJoin = capture;
    node.rightJoin = capture;
    node.where = (condition: never) => {
      if (condition) {
        const query = dialect.sqlToQuery(condition);
        wheres.push(query.sql);
        params.push(query.params);
      }
      return node;
    };
    node.orderBy = () => node;
    node.limit = () => node;
    node.offset = () => node;
    node.then = (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return node;
  }

  return {
    database: {
      select: vi.fn(() => chain(queue.shift() ?? [])),
    } as unknown as Database,
    params,
    tables,
    wheres,
  };
}

const emptyList = [[], [{ value: 0 }]];

describe("public advocacy queries", () => {
  it("only ever reads the advocacy update and its category", async () => {
    const recorded = recordingDatabase(...emptyList);

    await listPublishedContent("advocacy", {}, recorded.database);

    expect(new Set(recorded.tables)).toEqual(
      new Set(["advocacy_updates", "categories"]),
    );
    for (const table of privateTables) {
      expect(recorded.tables).not.toContain(table);
    }
  });

  it("filters drafts out in SQL on both the rows and the count query", async () => {
    const recorded = recordingDatabase(...emptyList);

    await listPublishedContent("advocacy", {}, recorded.database);

    // Two queries run: the page of rows and the total count. A filter applied
    // to only one of them is the bug this asserts against.
    expect(recorded.wheres).toHaveLength(2);
    for (const [index, where] of recorded.wheres.entries()) {
      expect(where).toContain('"advocacy_updates"."publication_status" =');
      expect(where).toContain('"advocacy_updates"."published_at" is not null');
      expect(recorded.params[index]).toContain("PUBLISHED");
    }
  });

  it("binds the public category filter as a parameter", async () => {
    const recorded = recordingDatabase(...emptyList);

    await listPublishedContent(
      "advocacy",
      { category: "fasilitas-kampus" },
      recorded.database,
    );

    expect(recorded.wheres[0]).toContain('"categories"."slug" =');
    expect(recorded.params[0]).toContain("fasilitas-kampus");
    // Still parameterised, so a category string cannot alter the statement.
    expect(recorded.wheres[0]).not.toContain("fasilitas-kampus");
  });

  it("keeps the detail path behind the same published filter", async () => {
    const recorded = recordingDatabase([]);

    await getPublishedContent("advocacy", "some-slug", recorded.database);

    expect(new Set(recorded.tables)).toEqual(
      new Set(["advocacy_updates", "categories"]),
    );
    expect(recorded.wheres[0]).toContain(
      '"advocacy_updates"."publication_status" =',
    );
    expect(recorded.wheres[0]).toContain(
      '"advocacy_updates"."published_at" is not null',
    );
    expect(recorded.params[0]).toContain("PUBLISHED");
    expect(recorded.params[0]).toContain("some-slug");
  });
});

describe("public student info queries", () => {
  it("only ever reads the student info table", async () => {
    const recorded = recordingDatabase(...emptyList);

    await listPublishedContent("student-info", {}, recorded.database);

    expect(new Set(recorded.tables)).toEqual(new Set(["student_info_posts"]));
    for (const table of privateTables) {
      expect(recorded.tables).not.toContain(table);
    }
  });

  it("filters drafts out in SQL on both the rows and the count query", async () => {
    const recorded = recordingDatabase(...emptyList);

    await listPublishedContent("student-info", {}, recorded.database);

    expect(recorded.wheres).toHaveLength(2);
    for (const [index, where] of recorded.wheres.entries()) {
      expect(where).toContain('"student_info_posts"."publication_status" =');
      expect(where).toContain(
        '"student_info_posts"."published_at" is not null',
      );
      expect(recorded.params[index]).toContain("PUBLISHED");
    }
  });

  it("keeps the detail path behind the same published filter", async () => {
    const recorded = recordingDatabase([]);

    await getPublishedContent("student-info", "some-slug", recorded.database);

    expect(new Set(recorded.tables)).toEqual(new Set(["student_info_posts"]));
    expect(recorded.wheres[0]).toContain(
      '"student_info_posts"."publication_status" =',
    );
    expect(recorded.wheres[0]).toContain(
      '"student_info_posts"."published_at" is not null',
    );
    expect(recorded.params[0]).toContain("PUBLISHED");
  });

  it("refuses an unknown category without building a query at all", async () => {
    const recorded = recordingDatabase(...emptyList);

    const result = await listPublishedContent(
      "student-info",
      { category: "'; drop table student_info_posts; --" },
      recorded.database,
    );

    expect(result.items).toEqual([]);
    expect(recorded.tables).toEqual([]);
    expect(recorded.wheres).toEqual([]);
  });
});

describe("draft invisibility across every public read path", () => {
  const nonPublicStatuses = ["DRAFT", "IN_REVIEW", "SCHEDULED", "ARCHIVED"];

  it("never binds a non-published status on any public path", async () => {
    const calls: Array<() => Promise<unknown>> = [];
    const recorders: Recorded[] = [];

    for (const kind of ["advocacy", "student-info"] as const) {
      const list = recordingDatabase(...emptyList);
      recorders.push(list);
      calls.push(() => listPublishedContent(kind, {}, list.database));

      const detail = recordingDatabase([]);
      recorders.push(detail);
      calls.push(() => getPublishedContent(kind, "a-slug", detail.database));
    }

    await Promise.all(calls.map((call) => call()));

    const allParams = recorders.flatMap((recorder) => recorder.params.flat());
    expect(allParams).toContain("PUBLISHED");
    for (const status of nonPublicStatuses) {
      expect(allParams).not.toContain(status);
    }
  });
});
