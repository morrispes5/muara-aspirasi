import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  create: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("@/server/aspirations/rate-limit", async (original) => ({
  ...(await original<typeof import("./rate-limit")>()),
  consumePublicRateLimit: mocks.consume,
}));
vi.mock("@/server/aspirations/evidence-service", async (original) => ({
  ...(await original<typeof import("./evidence-service")>()),
  createEvidenceUploadIntents: mocks.create,
}));
vi.mock("@/server/storage/r2", async (original) => ({
  ...(await original<typeof import("@/server/storage/r2")>()),
  isR2EvidenceEnabled: mocks.enabled,
}));

import {
  evidenceIntentCircuitBreaker,
  evidenceIntentRateLimit,
  PublicRateLimitError,
} from "./rate-limit";
import { POST } from "@/app/api/aspirasi/evidence/intents/route";

const file = { name: "test.pdf", size: 50, type: "application/pdf" };
const request = (body: unknown, origin = "https://example.test") =>
  new Request("https://example.test/api/aspirasi/evidence/intents", {
    method: "POST",
    headers: { origin },
    body: JSON.stringify(body),
  });

describe("evidence quota isolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.enabled.mockReturnValue(true);
    mocks.create.mockResolvedValue({ uploads: [], totalBytes: 50 });
  });
  it("rejects a disabled feature before any quota or upload work", async () => {
    mocks.enabled.mockReturnValue(false);
    expect((await POST(request({ files: [] }))).status).toBe(503);
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([
    { files: [] },
    { files: [file, file, file, file] },
    { files: [{ ...file, size: 0 }] },
    { files: [{ ...file, type: "text/html" }] },
  ])("rejects invalid descriptors before quotas: %j", async ({ files }) => {
    expect((await POST(request({ files }))).status).toBe(422);
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("bounds real body bytes even without Content-Length", async () => {
    expect(
      (await POST(request({ files: [{ ...file, name: "x".repeat(9000) }] })))
        .status,
    ).toBe(413);
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it("charges valid uploads only to evidence-specific budgets", async () => {
    expect((await POST(request({ files: [file] }))).status).toBe(201);
    expect(mocks.consume.mock.calls).toEqual([
      [evidenceIntentRateLimit, "unknown"],
      [evidenceIntentCircuitBreaker, "all-evidence"],
    ]);
    expect(mocks.create).toHaveBeenCalledWith([file]);
  });
  it("rejects cross-origin requests before upload work", async () => {
    expect(
      (await POST(request({ files: [file] }, "https://untrusted.example")))
        .status,
    ).toBe(403);
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it("preserves throttling and Retry-After", async () => {
    mocks.consume.mockRejectedValue(new PublicRateLimitError(120));
    const response = await POST(request({ files: [file] }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("120");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
