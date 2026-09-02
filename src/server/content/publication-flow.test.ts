import { describe, expect, it, vi } from "vitest";

import {
  ContentServiceError,
  listPublishedContent,
  mutateContent,
  validateContentInput,
} from "@/server/content/publication";
import { type Database } from "@/server/db/client";

const contentId = "8d7c6b5a-4e3f-4a2b-8c1d-0e9f8a7b6c5d";
const updatedAt = new Date("2026-08-20T03:00:00.000Z");

const studentInfoInput = {
  body: "Isi informasi mahasiswa yang sudah ditinjau dan aman dibaca publik.",
  category: "ACADEMIC",
  slug: "layanan-akademik-semester-ganjil",
  summary: "Ringkasan singkat untuk kartu arsip.",
  title: "Layanan akademik semester ganjil",
};

const advocacyInput = {
  body: "Uraian koordinasi advokasi yang aman dibaca publik oleh mahasiswa.",
  categoryId: "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d",
  progressLabel: "Sedang dikoordinasikan",
  slug: "koordinasi-fasilitas-belajar",
  summary: "Ringkasan singkat untuk kartu arsip.",
  title: "Koordinasi fasilitas belajar",
};

function currentRow(overrides: Record<string, unknown> = {}) {
  return {
    archivedAt: null,
    authorUserId: "9a2b8f21-0d4e-4c33-8a71-4f5b6c7d8e90",
    body: studentInfoInput.body,
    category: "ACADEMIC",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    id: contentId,
    isPinned: false,
    publicationStatus: "DRAFT",
    publishedAt: null,
    publishedByUserId: null,
    reviewerUserId: null,
    scheduledAt: null,
    slug: studentInfoInput.slug,
    sourceCredit: null,
    sourceUrl: null,
    summary: studentInfoInput.summary,
    title: studentInfoInput.title,
    updatedAt,
    ...overrides,
  };
}

/**
 * A transaction stub that records what the service actually issues. `selects`
 * is consumed in call order: the slug availability lookup first, then the row
 * being mutated. `updateResult` is what the guarded `UPDATE ... WHERE
 * updated_at = expected` returns, which is how the optimistic lock reports a
 * lost race.
 */
function transactionStub({
  selects,
  updateResult = [{ id: contentId }],
}: {
  selects: unknown[];
  updateResult?: unknown[];
}) {
  const selectQueue = [...selects];
  const setValues: Record<string, unknown>[] = [];
  let updateCalls = 0;

  function readChain(result: unknown) {
    const node: Record<string, unknown> = {};
    for (const step of ["from", "innerJoin", "where", "orderBy", "limit"]) {
      node[step] = () => node;
    }
    node.then = (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject);
    return node;
  }

  const transaction = {
    delete: () => readChain([]),
    insert: () => ({
      onConflictDoNothing: () => readChain([{ id: contentId }]),
      returning: () => readChain([{ id: contentId }]),
      values: () => readChain([]),
    }),
    select: vi.fn(() => readChain(selectQueue.shift() ?? [])),
    update: () => {
      updateCalls += 1;
      return {
        set: (values: Record<string, unknown>) => {
          setValues.push(values);
          return {
            where: () => ({ returning: () => readChain(updateResult) }),
          };
        },
      };
    },
  };

  return {
    database: {
      transaction: (run: (tx: unknown) => unknown) => run(transaction),
    } as unknown as Database,
    setValues,
    get updateCalls() {
      return updateCalls;
    },
  };
}

const actor = "9a2b8f21-0d4e-4c33-8a71-4f5b6c7d8e90";

describe("optimistic concurrency on publication edits", () => {
  it("refuses a stale expectedUpdatedAt before issuing any write", async () => {
    const stub = transactionStub({ selects: [[], [currentRow()]] });

    await expect(
      mutateContent(
        "student-info",
        contentId,
        "save_draft",
        studentInfoInput,
        "2026-08-19T00:00:00.000Z",
        actor,
        stub.database,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(stub.updateCalls).toBe(0);
  });

  it("reports a conflict when the guarded update matches no row", async () => {
    // The row was read successfully but changed between the read and the
    // write, so `WHERE updated_at = expected` matched nothing.
    const stub = transactionStub({
      selects: [[], [currentRow()]],
      updateResult: [],
    });

    await expect(
      mutateContent(
        "student-info",
        contentId,
        "save_draft",
        studentInfoInput,
        updatedAt.toISOString(),
        actor,
        stub.database,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(stub.updateCalls).toBe(1);
  });

  it("rejects a missing row as NOT_FOUND rather than creating one", async () => {
    const stub = transactionStub({ selects: [[], []] });

    await expect(
      mutateContent(
        "student-info",
        contentId,
        "save_draft",
        studentInfoInput,
        updatedAt.toISOString(),
        actor,
        stub.database,
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(stub.updateCalls).toBe(0);
  });

  it("rejects a slug already used by another post", async () => {
    const stub = transactionStub({
      selects: [[{ id: "a-different-id" }], [currentRow()]],
    });

    await expect(
      mutateContent(
        "student-info",
        contentId,
        "save_draft",
        studentInfoInput,
        updatedAt.toISOString(),
        actor,
        stub.database,
      ),
    ).rejects.toMatchObject({ code: "SLUG_TAKEN" });

    expect(stub.updateCalls).toBe(0);
  });
});

describe("publication transition enforcement in the service", () => {
  it.each([
    ["DRAFT", "publish"],
    ["DRAFT", "archive"],
    ["IN_REVIEW", "archive"],
    ["PUBLISHED", "publish"],
    ["ARCHIVED", "save_draft"],
    ["ARCHIVED", "publish"],
  ] as const)(
    "refuses %s -> %s and issues no write",
    async (publicationStatus, action) => {
      const stub = transactionStub({
        selects: [[], [currentRow({ publicationStatus })]],
      });

      await expect(
        mutateContent(
          "student-info",
          contentId,
          action,
          studentInfoInput,
          updatedAt.toISOString(),
          actor,
          stub.database,
        ),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      expect(stub.updateCalls).toBe(0);
    },
  );

  it("pulls live content back to DRAFT when it is edited", async () => {
    // Editing published content must remove it from the public archive until
    // it is reviewed and approved again, not silently rewrite what is live.
    const stub = transactionStub({
      selects: [
        [],
        [
          currentRow({
            publicationStatus: "PUBLISHED",
            publishedAt: updatedAt,
          }),
        ],
        [],
      ],
    });

    await mutateContent(
      "student-info",
      contentId,
      "save_draft",
      studentInfoInput,
      updatedAt.toISOString(),
      actor,
      stub.database,
    ).catch(() => undefined);

    expect(stub.setValues[0]).toMatchObject({ publicationStatus: "DRAFT" });
  });

  it("pulls a live advocacy update back to DRAFT when it is edited", async () => {
    // Same rule as student info, asserted separately because the two kinds are
    // written as independent branches in the service.
    const stub = transactionStub({
      selects: [
        [],
        [{ id: advocacyInput.categoryId }],
        [
          {
            ...currentRow({
              publicationStatus: "PUBLISHED",
              publishedAt: updatedAt,
            }),
            categoryId: advocacyInput.categoryId,
            progressLabel: advocacyInput.progressLabel,
          },
        ],
        [],
      ],
    });

    await mutateContent(
      "advocacy",
      contentId,
      "save_draft",
      advocacyInput,
      updatedAt.toISOString(),
      actor,
      stub.database,
    ).catch(() => undefined);

    expect(stub.setValues[0]).toMatchObject({ publicationStatus: "DRAFT" });
  });

  it("stamps reviewer and publisher when an approver publishes", async () => {
    const stub = transactionStub({
      selects: [[], [currentRow({ publicationStatus: "IN_REVIEW" })], []],
    });

    await mutateContent(
      "student-info",
      contentId,
      "publish",
      studentInfoInput,
      updatedAt.toISOString(),
      actor,
      stub.database,
    ).catch(() => undefined);

    expect(stub.setValues[0]).toMatchObject({
      publicationStatus: "PUBLISHED",
      publishedByUserId: actor,
      reviewerUserId: actor,
    });
    expect(stub.setValues[0].publishedAt).toBeInstanceOf(Date);
  });
});

describe("plain text safety for public content", () => {
  it.each([
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "Teks biasa lalu <b>tebal</b> di tengah kalimat panjang ini.",
    "Tanda kurung sudut tunggal < juga ditolak pada isi konten.",
  ])("refuses markup in the body: %s", (body) => {
    expect(() =>
      validateContentInput("student-info", { ...studentInfoInput, body }),
    ).toThrow(ContentServiceError);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
  ])("refuses an unsafe source URL: %s", (sourceUrl) => {
    expect(() =>
      validateContentInput("student-info", { ...studentInfoInput, sourceUrl }),
    ).toThrow(ContentServiceError);
  });

  it("accepts ordinary prose and an https source", () => {
    expect(() =>
      validateContentInput("student-info", {
        ...studentInfoInput,
        sourceUrl: "https://example.ac.id/pengumuman",
      }),
    ).not.toThrow();
  });
});

describe("public pagination limits", () => {
  function emptyDatabase() {
    function chain(result: unknown) {
      const node: Record<string, unknown> = {};
      for (const step of [
        "from",
        "innerJoin",
        "where",
        "orderBy",
        "limit",
        "offset",
      ]) {
        node[step] = () => node;
      }
      node.then = (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject);
      return node;
    }
    const queue: unknown[] = [[], [{ value: 240 }]];
    return {
      select: vi.fn(() => chain(queue.shift() ?? [])),
    } as unknown as Database;
  }

  it("caps an oversized page size so one request cannot drain the archive", async () => {
    const result = await listPublishedContent(
      "advocacy",
      { page: 1, pageSize: 5000 },
      emptyDatabase(),
    );

    expect(result.pageSize).toBe(50);
  });

  it.each([0, -3, 1.5, Number.NaN])(
    "falls back to page 1 for the invalid page %s",
    async (page) => {
      const result = await listPublishedContent(
        "advocacy",
        { page },
        emptyDatabase(),
      );

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(12);
    },
  );

  it("reports total pages from the count query", async () => {
    const result = await listPublishedContent(
      "advocacy",
      { page: 2, pageSize: 12 },
      emptyDatabase(),
    );

    expect(result).toMatchObject({ page: 2, totalItems: 240, totalPages: 20 });
  });
});
