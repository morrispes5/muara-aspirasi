import { beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  audit: vi.fn(),
  rate: vi.fn(),
  edit: vi.fn(),
}));
vi.mock("@/server/auth/session", async (original) => ({
  ...(await original<typeof import("@/server/auth/session")>()),
  requireBemPermission: mocks.auth,
}));
vi.mock("./case-management", async (original) => ({
  ...(await original<typeof import("./case-management")>()),
  listReportQueue: mocks.list,
  editReportContent: mocks.edit,
}));
vi.mock("./submission-service", async (original) => ({
  ...(await original<typeof import("./submission-service")>()),
  submitAdminReport: mocks.create,
}));
vi.mock("@/server/auth/audit", () => ({ recordAuthAuditEvent: mocks.audit }));
vi.mock("./rate-limit", async (original) => ({
  ...(await original<typeof import("./rate-limit")>()),
  consumePublicRateLimit: mocks.rate,
}));
import { AuthorizationError } from "@/server/auth/session";
import { POST as createReport } from "@/app/api/admin/reports/create/route";
import { POST as editReport } from "@/app/api/admin/reports/[id]/route";
import { POST as exportReport } from "@/app/api/admin/reports/export/route";
import { PublicRateLimitError } from "./rate-limit";

const fields = {
  name: "Mahasiswa QA",
  nim: "0012345678",
  email: "student@example.test",
  whatsapp: "081200000000",
  title: "Fasilitas QA",
  location: "Ruang QA",
  chronology: "Kondisi fasilitas perlu diperiksa.",
  impact: "Kegiatan terganggu.",
  suggestedSolution: "Periksa fasilitas.",
};
const req = (path: string, body: unknown, origin = "https://example.test") =>
  new Request("https://example.test/api/admin/reports/" + path, {
    method: "POST",
    headers: { origin, "idempotency-key": randomUUID() },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "owner", role: "ADMIN" } });
  mocks.list.mockResolvedValue({ items: [], totalItems: 0 });
});
it("denies anonymous export and create without reading or writing reports", async () => {
  mocks.auth.mockRejectedValue(new AuthorizationError(401, "No session"));
  expect((await exportReport(req("export", { filters: "" }))).status).toBe(401);
  expect((await createReport(req("create", {}))).status).toBe(401);
  expect(mocks.list).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects cross-origin before privileged actions", async () => {
  expect(
    (await exportReport(req("export", { filters: "" }, "https://other.test")))
      .status,
  ).toBe(403);
  expect(
    (await createReport(req("create", {}, "https://other.test"))).status,
  ).toBe(403);
  expect(mocks.auth).not.toHaveBeenCalled();
});
it("exports all matching pages with explicit permission, no cache, and audit", async () => {
  const response = await exportReport(
    req("export", { filters: "status=RECEIVED&page=3" }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(mocks.auth).toHaveBeenCalledWith(
    "EXPORT_REPORTS",
    expect.any(Headers),
  );
  expect(mocks.list).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1, pageSize: 2001, status: "RECEIVED" }),
    undefined,
    { includeRestricted: true },
  );
  expect(mocks.audit).toHaveBeenCalledWith(
    expect.objectContaining({
      action: "REPORTS_EXPORTED",
      metadata: { rowCount: 0, format: "xlsx" },
    }),
  );
});
it("refuses oversized exports instead of silently truncating", async () => {
  mocks.list.mockResolvedValue({ items: [], totalItems: 2001 });
  expect((await exportReport(req("export", { filters: "" }))).status).toBe(400);
});
it("throttles repeated exports and exposes Retry-After", async () => {
  mocks.rate.mockRejectedValue(new PublicRateLimitError(120));
  const response = await exportReport(req("export", { filters: "" }));
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("120");
  expect(mocks.list).not.toHaveBeenCalled();
});
it("requires complete student identity and consent for admin-created reports", async () => {
  expect(
    (
      await createReport(
        req("create", {
          ...fields,
          categoryId: randomUUID(),
          contactAllowed: false,
          ethicsAccepted: false,
        }),
      )
    ).status,
  ).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.create.mockResolvedValue({
    trackingCode: "code",
    trackingSecret: "secret",
    reportId: "report",
  });
  expect(
    (
      await createReport(
        req("create", {
          ...fields,
          categoryId: randomUUID(),
          contactAllowed: false,
          ethicsAccepted: true,
        }),
      )
    ).status,
  ).toBe(201);
  expect(mocks.auth).toHaveBeenCalledWith("CREATE_REPORT", expect.any(Headers));
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      nim: "0012345678",
      identityMode: "CONFIDENTIAL_BEM_ONLY",
      contactAllowed: false,
    }),
    expect.any(String),
    "owner",
  );
});
it("prevents advocate content edits and passes version/actor for owner edits", async () => {
  const id = randomUUID();
  const requestBody = {
    action: "edit-content",
    fields,
    expectedUpdatedAt: "2026-09-20T00:00:00Z",
    reason: "Koreksi dikonfirmasi",
  };
  mocks.auth.mockResolvedValue({ user: { id: "advocate", role: "ADVOCATE" } });
  expect(
    (
      await editReport(req(id, requestBody), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(403);
  expect(mocks.edit).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ user: { id: "owner", role: "ADMIN" } });
  expect(
    (
      await editReport(req(id, requestBody), {
        params: Promise.resolve({ id }),
      })
    ).status,
  ).toBe(200);
  expect(mocks.edit).toHaveBeenCalledWith({
    actorUserId: "owner",
    reportId: id,
    fields,
    reason: requestBody.reason,
    expectedUpdatedAt: requestBody.expectedUpdatedAt,
  });
});
