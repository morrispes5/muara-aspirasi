import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/server/auth/session";
import type { BemRole } from "@/server/auth/roles";
import { ContentServiceError } from "@/server/content/publication";

/**
 * These tests cover the route handler's own composition: the origin guard, the
 * role checks it performs with `hasPermission`, and how it maps a service error
 * onto a status and a safe body.
 *
 * `requireBemPermission` is stubbed because Better Auth session validation is
 * not what is under test here — the boundary being tested is what the handler
 * does once it holds a session of a given role. The role checks themselves run
 * against the real permission matrix, and every negative case asserts that the
 * service was never reached, so a guard that stopped blocking would fail rather
 * than quietly pass.
 */
const requireBemPermission = vi.hoisted(() => vi.fn());
const getAdminContent = vi.hoisted(() => vi.fn());
const mutateContent = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/session")>()),
  requireBemPermission,
}));

vi.mock("@/server/content/publication", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/content/publication")>()),
  getAdminContent,
  mutateContent,
}));

const { PATCH } = await import("@/app/api/admin/content/[kind]/[id]/route");

const origin = "https://muara.example.ac.id";
const contentId = "8d7c6b5a-4e3f-4a2b-8c1d-0e9f8a7b6c5d";
const endpoint = `${origin}/api/admin/content/advocacy/${contentId}`;

const validBody = {
  body: "Uraian koordinasi advokasi yang aman dibaca publik.",
  categoryId: "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d",
  expectedUpdatedAt: "2026-08-20T03:00:00.000Z",
  progressLabel: "Sedang dikoordinasikan",
  slug: "koordinasi-fasilitas-belajar",
  summary: "Ringkasan singkat untuk kartu arsip.",
  title: "Koordinasi fasilitas belajar",
};

function sessionFor(role: BemRole) {
  return {
    session: { id: "session-1" },
    user: {
      email: "bem@example.ac.id",
      id: "9a2b8f21-0d4e-4c33-8a71-4f5b6c7d8e90",
      name: "BEM",
      role,
      status: "ACTIVE",
    },
  };
}

function patch(
  body: Record<string, unknown>,
  { requestOrigin = origin }: { requestOrigin?: string | null } = {},
) {
  return new Request(endpoint, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(requestOrigin ? { origin: requestOrigin } : {}),
    },
    method: "PATCH",
  });
}

function asContext() {
  return { params: Promise.resolve({ id: contentId, kind: "advocacy" }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getAdminContent.mockResolvedValue({ publicationStatus: "DRAFT" });
  mutateContent.mockResolvedValue({ id: contentId, title: "ok" });
});

describe("content route origin guard", () => {
  it("rejects a cross-origin write before it authenticates anything", async () => {
    const response = await PATCH(
      patch(
        { ...validBody, action: "save_draft" },
        {
          requestOrigin: "https://attacker.example",
        },
      ),
      asContext(),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "REQUEST_REJECTED" },
    });
    expect(requireBemPermission).not.toHaveBeenCalled();
    expect(mutateContent).not.toHaveBeenCalled();
  });
});

describe("content route publication approval boundary", () => {
  it.each(["EDITOR", "ADVOCATE"] as const)(
    "refuses %s publishing and never reaches the service",
    async (role) => {
      requireBemPermission.mockResolvedValue(sessionFor(role));

      const response = await PATCH(
        patch({ ...validBody, action: "publish" }),
        asContext(),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "FORBIDDEN" },
      });
      expect(mutateContent).not.toHaveBeenCalled();
    },
  );

  it.each(["EDITOR", "ADVOCATE"] as const)(
    "refuses %s archiving and never reaches the service",
    async (role) => {
      requireBemPermission.mockResolvedValue(sessionFor(role));

      const response = await PATCH(
        patch({ ...validBody, action: "archive" }),
        asContext(),
      );

      expect(response.status).toBe(403);
      expect(mutateContent).not.toHaveBeenCalled();
    },
  );

  it("lets ADMIN publish and passes the action through", async () => {
    requireBemPermission.mockResolvedValue(sessionFor("ADMIN"));

    const response = await PATCH(
      patch({ ...validBody, action: "publish" }),
      asContext(),
    );

    expect(response.status).toBe(200);
    expect(mutateContent).toHaveBeenCalledOnce();
    expect(mutateContent.mock.calls[0][2]).toBe("publish");
  });
});

describe("content route published-edit boundary", () => {
  it("refuses a non-approver editing content that is already live", async () => {
    requireBemPermission.mockResolvedValue(sessionFor("ADVOCATE"));
    getAdminContent.mockResolvedValue({ publicationStatus: "PUBLISHED" });

    const response = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );

    expect(response.status).toBe(403);
    expect(mutateContent).not.toHaveBeenCalled();
  });

  it("still lets a non-approver edit a draft", async () => {
    requireBemPermission.mockResolvedValue(sessionFor("ADVOCATE"));
    getAdminContent.mockResolvedValue({ publicationStatus: "DRAFT" });

    const response = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );

    expect(response.status).toBe(200);
    expect(mutateContent).toHaveBeenCalledOnce();
  });

  it("lets an approver edit live content", async () => {
    requireBemPermission.mockResolvedValue(sessionFor("ADMIN"));
    getAdminContent.mockResolvedValue({ publicationStatus: "PUBLISHED" });

    const response = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );

    expect(response.status).toBe(200);
  });
});

describe("content route report linkage boundary", () => {
  it("refuses an EDITOR attaching report ids to a public update", async () => {
    requireBemPermission.mockResolvedValue(sessionFor("EDITOR"));

    const response = await PATCH(
      patch({
        ...validBody,
        action: "save_draft",
        reportIds: ["1ea889bc-f591-4d08-bf40-7d7d9f71fb0d"],
      }),
      asContext(),
    );

    expect(response.status).toBe(403);
    expect(mutateContent).not.toHaveBeenCalled();
  });

  it("refuses an EDITOR sending an empty reportIds array", async () => {
    // The guard keys off the property being present, not its length, so an
    // empty array must not be a way to reach the linkage path unchecked.
    requireBemPermission.mockResolvedValue(sessionFor("EDITOR"));

    const response = await PATCH(
      patch({ ...validBody, action: "save_draft", reportIds: [] }),
      asContext(),
    );

    expect(response.status).toBe(403);
    expect(mutateContent).not.toHaveBeenCalled();
  });

  it("lets an ADVOCATE who can process reports attach them", async () => {
    requireBemPermission.mockResolvedValue(sessionFor("ADVOCATE"));

    const response = await PATCH(
      patch({
        ...validBody,
        action: "save_draft",
        reportIds: ["1ea889bc-f591-4d08-bf40-7d7d9f71fb0d"],
      }),
      asContext(),
    );

    expect(response.status).toBe(200);
  });
});

describe("content route error mapping", () => {
  beforeEach(() => {
    requireBemPermission.mockResolvedValue(sessionFor("ADMIN"));
  });

  it("turns a stale expectedUpdatedAt into 409 without leaking internals", async () => {
    mutateContent.mockRejectedValue(
      new ContentServiceError(
        "CONFLICT",
        "Konten baru saja berubah. Muat ulang terlebih dahulu.",
      ),
    );

    const response = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error.code).toBe("CONFLICT");
    expect(JSON.stringify(payload)).not.toMatch(/stack|select |drizzle|neon/i);
  });

  it("maps a taken slug to 409 and a missing row to 404", async () => {
    mutateContent.mockRejectedValue(
      new ContentServiceError("SLUG_TAKEN", "Slug sudah digunakan."),
    );
    expect(
      (await PATCH(patch({ ...validBody, action: "save_draft" }), asContext()))
        .status,
    ).toBe(409);

    mutateContent.mockRejectedValue(
      new ContentServiceError("NOT_FOUND", "Konten tidak ditemukan."),
    );
    expect(
      (await PATCH(patch({ ...validBody, action: "save_draft" }), asContext()))
        .status,
    ).toBe(404);
  });

  it("hides an unexpected failure behind a generic 500", async () => {
    mutateContent.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.5:5432 password=hunter2"),
    );

    const response = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error.code).toBe("REQUEST_FAILED");
    expect(JSON.stringify(payload)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(payload)).not.toContain("hunter2");
  });

  it("rejects an unknown action and an unknown content kind", async () => {
    const badAction = await PATCH(
      patch({ ...validBody, action: "schedule" }),
      asContext(),
    );
    expect(badAction.status).toBe(400);
    expect(mutateContent).not.toHaveBeenCalled();

    const badKind = await PATCH(patch({ ...validBody, action: "save_draft" }), {
      params: Promise.resolve({ id: contentId, kind: "reports" }),
    });
    expect(badKind.status).toBe(400);
    expect(mutateContent).not.toHaveBeenCalled();
  });

  it("rejects a malformed JSON body", async () => {
    const response = await PATCH(
      new Request(endpoint, {
        body: "{not json",
        headers: { "content-type": "application/json", origin },
        method: "PATCH",
      }),
      asContext(),
    );

    expect(response.status).toBe(400);
    expect(mutateContent).not.toHaveBeenCalled();
  });

  it("maps a missing session to 401 and a wrong role to 403", async () => {
    requireBemPermission.mockRejectedValue(
      new AuthorizationError(401, "Sesi BEM tidak ditemukan."),
    );
    const unauthenticated = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );
    expect(unauthenticated.status).toBe(401);
    await expect(unauthenticated.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED" },
    });

    requireBemPermission.mockRejectedValue(
      new AuthorizationError(403, "Peran BEM tidak memiliki izin ini."),
    );
    const forbidden = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );
    expect(forbidden.status).toBe(403);
  });

  it("keeps admin responses out of caches and search indexes", async () => {
    const response = await PATCH(
      patch({ ...validBody, action: "save_draft" }),
      asContext(),
    );

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
