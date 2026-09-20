import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  verify: vi.fn(),
  submit: vi.fn(),
  evidence: vi.fn(),
}));
vi.mock("@/server/aspirations/rate-limit", async (original) => ({
  ...(await original<typeof import("./rate-limit")>()),
  consumePublicRateLimit: mocks.consume,
}));
vi.mock("@/server/aspirations/turnstile", async (original) => ({
  ...(await original<typeof import("./turnstile")>()),
  verifyTurnstile: mocks.verify,
}));
vi.mock("@/server/aspirations/submission-service", async (original) => ({
  ...(await original<typeof import("./submission-service")>()),
  submitPublicReport: mocks.submit,
}));
vi.mock("@/server/aspirations/evidence-service", async (original) => ({
  ...(await original<typeof import("./evidence-service")>()),
  prepareEvidenceForSubmission: mocks.evidence,
}));
import { POST } from "@/app/api/aspirasi/route";
import { PublicRateLimitError } from "./rate-limit";
import { TurnstileVerificationError } from "./turnstile";

const body = {
  categoryId: "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d",
  chronology: "Kondisi ruang perlu diperiksa.",
  contactAllowed: false,
  evidence: [],
  email: "",
  ethicsAccepted: true,
  honeypot: "",
  identityMode: "CONFIDENTIAL_BEM_ONLY",
  impact: "Kegiatan belajar terganggu.",
  limitedShareConsent: false,
  location: "Ruang contoh",
  name: "Mahasiswa QA",
  nim: "TEST123",
  suggestedSolution: "",
  title: "Fasilitas ruang belajar",
  turnstileToken: "test-token",
  whatsapp: "",
};
const request = (overrides = {}) =>
  new Request("https://example.test/api/aspirasi", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "idempotency-key": "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d",
    },
    body: JSON.stringify({ ...body, ...overrides }),
  });

describe("submission abuse boundary", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects a filled honeypot before database writes", async () => {
    expect((await POST(request({ honeypot: "bot" }))).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("rejects failed Turnstile before report/evidence writes", async () => {
    mocks.verify.mockRejectedValue(new TurnstileVerificationError("REJECTED"));
    expect((await POST(request())).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.evidence).not.toHaveBeenCalled();
  });
  it("returns Retry-After and never creates a throttled report", async () => {
    mocks.consume.mockRejectedValue(new PublicRateLimitError(180));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("180");
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
