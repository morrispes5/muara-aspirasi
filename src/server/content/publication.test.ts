import { describe, expect, it, vi } from "vitest";

import {
  canTransitionPublication,
  ContentServiceError,
  createContent,
  getPublishedContent,
  listAdminContent,
  listPublishedContent,
  parseContentAction,
  parseContentKind,
  publicationActions,
  validateContentInput,
} from "@/server/content/publication";

import { type Database } from "@/server/db/client";

const categoryId = "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d";

const baseInput = {
  body: "Ringkasan proses dan informasi yang aman untuk dibaca publik.",
  slug: "progres-layanan-akademik",
  summary: "Pembaruan proses layanan akademik untuk mahasiswa.",
  title: "Pembaruan layanan akademik",
};

describe("publication policy", () => {
  it("enforces the direct publish lifecycle without a fake scheduler", () => {
    expect(canTransitionPublication("advocacy", "DRAFT", "submit_review")).toBe(
      true,
    );
    expect(canTransitionPublication("advocacy", "IN_REVIEW", "publish")).toBe(
      true,
    );
    expect(canTransitionPublication("student-info", "DRAFT", "publish")).toBe(
      false,
    );
    expect(
      canTransitionPublication("student-info", "IN_REVIEW", "archive"),
    ).toBe(false);
    expect(
      canTransitionPublication("student-info", "PUBLISHED", "archive"),
    ).toBe(true);
    expect(
      canTransitionPublication("student-info", "ARCHIVED", "save_draft"),
    ).toBe(false);
  });

  it("normalizes safe content input and preserves the pin flag", () => {
    const normalized = validateContentInput("student-info", {
      ...baseInput,
      category: "ACADEMIC",
      isPinned: true,
      slug: "  Progres-Layanan-Akademik  ",
      sourceUrl: "https://example.com/info",
    });

    expect(normalized).toMatchObject({
      category: "ACADEMIC",
      isPinned: true,
      slug: "progres-layanan-akademik",
      sourceUrl: "https://example.com/info",
    });
  });

  it("rejects unsafe URLs, malformed categories, and invalid pin values", () => {
    const cases = [
      {
        ...baseInput,
        category: "ACADEMIC",
        sourceUrl: "javascript:alert(1)",
      },
      { ...baseInput, category: "UNKNOWN" },
      { ...baseInput, category: "ACADEMIC", isPinned: "yes" as never },
      { ...baseInput, category: "ACADEMIC", body: "<p>Konten HTML</p>" },
      { ...baseInput, categoryId, progressLabel: "Selesai" },
    ];

    expect(() => validateContentInput("student-info", cases[0])).toThrow(
      ContentServiceError,
    );
    expect(() => validateContentInput("student-info", cases[1])).toThrow(
      ContentServiceError,
    );
    expect(() => validateContentInput("student-info", cases[2])).toThrow(
      ContentServiceError,
    );
    expect(() => validateContentInput("student-info", cases[3])).toThrow(
      ContentServiceError,
    );
    expect(() =>
      validateContentInput("advocacy", {
        ...baseInput,
        categoryId,
        progressLabel: "Selesai",
      }),
    ).not.toThrow();
  });

  it("keeps route enum parsing fail-closed", () => {
    expect(parseContentKind("advocacy")).toBe("advocacy");
    expect(parseContentAction("publish")).toBe("publish");
    expect(() => parseContentKind("reports")).toThrow(ContentServiceError);
    expect(() => parseContentAction("schedule")).toThrow(ContentServiceError);
  });
});

/**
 * Minimal stand-in for a Drizzle query builder. Every chained step returns the
 * same object, and the object is thenable so `await` / `Promise.all` resolve it
 * to the row set the test supplied.
 */
function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const step of [
    "from",
    "innerJoin",
    "where",
    "orderBy",
    "limit",
    "offset",
  ]) {
    chain[step] = () => chain;
  }
  chain.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Hands back one queued row set per `select()` call, in call order. */
function readDatabase(...results: unknown[]) {
  const queue = [...results];
  const select = vi.fn(() => query(queue.shift() ?? []));
  return { database: { select } as unknown as Database, select };
}

const publishedAt = new Date("2026-08-20T03:00:00.000Z");

/**
 * A full `student_info_posts` row. The public list query is `select()`
 * (SELECT *), so the projection — not the query — is what keeps internal
 * columns off the public page. These extra fields exist to prove that.
 */
const studentInfoRow = {
  archivedAt: null,
  authorUserId: "9a2b8f21-0d4e-4c33-8a71-4f5b6c7d8e90",
  body: "Isi lengkap informasi mahasiswa yang hanya dibutuhkan halaman detail.",
  category: "ACADEMIC",
  coverAlt: "Alt teks internal",
  coverMediaKey: "internal/cover-key.png",
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  id: "3c4d5e6f-7a8b-4c9d-8e1f-2a3b4c5d6e7f",
  isPinned: true,
  publicationStatus: "PUBLISHED",
  publishedAt,
  publishedByUserId: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  reviewerUserId: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b",
  scheduledAt: null,
  slug: "layanan-akademik-semester-ganjil",
  sourceCredit: "Biro Akademik",
  sourceUrl: "https://example.ac.id/akademik",
  summary: "Ringkasan singkat untuk kartu arsip.",
  title: "Layanan akademik semester ganjil",
  updatedAt: new Date("2026-08-20T03:00:00.000Z"),
};

/**
 * An `advocacy_updates` row joined to its category. The extra internal columns
 * are not in the production select list; they are here so the test still fails
 * if that select list is ever widened to SELECT *.
 */
const advocacyRow = {
  archivedAt: null,
  authorUserId: "9a2b8f21-0d4e-4c33-8a71-4f5b6c7d8e90",
  body: "Uraian penuh koordinasi advokasi untuk halaman detail publik.",
  categoryId,
  categoryName: "Fasilitas kampus",
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  id: "8d7c6b5a-4e3f-4a2b-8c1d-0e9f8a7b6c5d",
  progressLabel: "Sedang dikoordinasikan",
  publicationStatus: "PUBLISHED",
  publishedAt,
  publishedByUserId: "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9",
  reviewerUserId: "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b",
  slug: "koordinasi-fasilitas-belajar",
  sourceCredit: "Notulen koordinasi",
  summary: "Ringkasan singkat untuk kartu arsip.",
  title: "Koordinasi fasilitas belajar",
  updatedAt: new Date("2026-08-20T03:00:00.000Z"),
};

const internalFields = [
  "archivedAt",
  "authorUserId",
  "body",
  "categoryId",
  "coverAlt",
  "coverMediaKey",
  "createdAt",
  "id",
  "publicationStatus",
  "publishedAt",
  "publishedByUserId",
  "reportIds",
  "reviewerUserId",
  "scheduledAt",
  "updatedAt",
];

describe("public content projection", () => {
  it("keeps the student info archive list to summary fields only", async () => {
    const { database } = readDatabase([studentInfoRow], [{ value: 1 }]);

    const result = await listPublishedContent("student-info", {}, database);

    expect(result.items).toHaveLength(1);
    const [item] = result.items;
    expect(Object.keys(item).sort()).toEqual([
      "category",
      "date",
      "excerpt",
      "isPinned",
      "readTime",
      "slug",
      "sourceCredit",
      "sourceUrl",
      "title",
    ]);
    for (const field of internalFields) {
      expect(item).not.toHaveProperty(field);
    }
    expect(JSON.stringify(item)).not.toContain(studentInfoRow.body);
    expect(item).toMatchObject({
      category: "Akademik",
      excerpt: studentInfoRow.summary,
      isPinned: true,
      slug: studentInfoRow.slug,
      title: studentInfoRow.title,
    });
    expect(item.date).toMatch(/2026/);
    expect(item.readTime).toMatch(/menit baca/);
  });

  it("keeps the advocacy archive list to summary fields only", async () => {
    const { database } = readDatabase([advocacyRow], [{ value: 1 }]);

    const result = await listPublishedContent("advocacy", {}, database);

    expect(result.items).toHaveLength(1);
    const [item] = result.items;
    expect(Object.keys(item).sort()).toEqual([
      "category",
      "date",
      "excerpt",
      "progressLabel",
      "readTime",
      "slug",
      "sourceCredit",
      "title",
    ]);
    for (const field of internalFields) {
      expect(item).not.toHaveProperty(field);
    }
    expect(JSON.stringify(item)).not.toContain(advocacyRow.body);
    expect(item).toMatchObject({
      category: advocacyRow.categoryName,
      excerpt: advocacyRow.summary,
      progressLabel: advocacyRow.progressLabel,
    });
  });

  it("still gives the detail page the body it renders", async () => {
    const { database } = readDatabase([advocacyRow]);

    const article = await getPublishedContent(
      "advocacy",
      advocacyRow.slug,
      database,
    );

    expect(article?.body).toBe(advocacyRow.body);
    for (const field of internalFields.filter((name) => name !== "body")) {
      expect(article).not.toHaveProperty(field);
    }
  });

  it("reports page counts from the same filtered query as the rows", async () => {
    const { database } = readDatabase([studentInfoRow], [{ value: 25 }]);

    const result = await listPublishedContent(
      "student-info",
      { page: 2, pageSize: 12 },
      database,
    );

    expect(result).toMatchObject({
      page: 2,
      pageSize: 12,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it("answers an unknown public category without querying the database", async () => {
    const { database, select } = readDatabase();

    const result = await listPublishedContent(
      "student-info",
      { category: "NOT_A_CATEGORY" },
      database,
    );

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(select).not.toHaveBeenCalled();
  });
});

describe("admin content queries", () => {
  it("rejects a status that is not in the kind's enum before querying", async () => {
    const { database, select } = readDatabase();

    await expect(
      listAdminContent("advocacy", { status: "NONSENSE" }, database),
    ).rejects.toThrow(ContentServiceError);
    await expect(
      listAdminContent("advocacy", { status: "SCHEDULED" }, database),
    ).rejects.toThrow(ContentServiceError);
    expect(select).not.toHaveBeenCalled();
  });

  it("accepts a status that the kind's enum really has", async () => {
    const { database } = readDatabase([studentInfoRow], [{ value: 1 }]);

    await expect(
      listAdminContent("student-info", { status: "SCHEDULED" }, database),
    ).resolves.toMatchObject({ totalItems: 1 });
  });
});

describe("linked report validation", () => {
  const advocacyInput = {
    ...baseInput,
    categoryId,
    progressLabel: "Sedang dikoordinasikan",
  };

  const actorUserId = "9a2b8f21-0d4e-4c33-8a71-4f5b6c7d8e90";

  /** Slug lookup resolves empty, so validation is the next thing to run. */
  function transactionDatabase() {
    const { database } = readDatabase([]);
    return {
      transaction: (run: (tx: Database) => unknown) => run(database),
    } as unknown as Database;
  }

  it("rejects a linked report id that is not a UUID", async () => {
    await expect(
      createContent(
        "advocacy",
        { ...advocacyInput, reportIds: ["not-a-uuid"] },
        actorUserId,
        transactionDatabase(),
      ),
    ).rejects.toThrow(ContentServiceError);
  });

  it("rejects more linked reports than one update may carry", async () => {
    const tooMany = Array.from(
      { length: 21 },
      (_item, index) =>
        `1ea889bc-f591-4d08-bf40-7d7d9f71f${index.toString().padStart(3, "0")}`,
    );

    await expect(
      createContent(
        "advocacy",
        { ...advocacyInput, reportIds: tooMany },
        actorUserId,
        transactionDatabase(),
      ),
    ).rejects.toThrow(ContentServiceError);
  });
});

describe("publication transition matrix", () => {
  const allowed: Record<string, string[]> = {
    ARCHIVED: [],
    DRAFT: ["save_draft", "submit_review"],
    IN_REVIEW: ["publish", "save_draft"],
    PUBLISHED: ["archive", "save_draft"],
    SCHEDULED: ["save_draft"],
  };

  it("allows exactly the documented action set for every status", () => {
    for (const kind of ["advocacy", "student-info"] as const) {
      for (const [from, actions] of Object.entries(allowed)) {
        const actual = publicationActions
          .filter((action) => canTransitionPublication(kind, from, action))
          .sort();
        expect({ from, kind, actual }).toEqual({
          from,
          kind,
          actual: [...actions].sort(),
        });
      }
    }
  });

  it("locks an archived post against every action", () => {
    for (const action of publicationActions) {
      expect(canTransitionPublication("advocacy", "ARCHIVED", action)).toBe(
        false,
      );
    }
  });

  /**
   * The domain transition stays available so an Admin can deliberately return
   * a published post to DRAFT for a new review cycle. The API route and admin
   * UI separately require APPROVE_PUBLICATION before allowing that edit, so a
   * regular drafter cannot rewrite live public content through the product.
   */
  it("allows an approver-controlled re-edit of a published post", () => {
    expect(
      canTransitionPublication("advocacy", "PUBLISHED", "save_draft"),
    ).toBe(true);
    expect(
      canTransitionPublication("student-info", "PUBLISHED", "save_draft"),
    ).toBe(true);
  });
});
