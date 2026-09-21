import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
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
import {
  PublicRateLimitError,
  submissionCircuitBreaker,
  submissionRateLimit,
} from "./rate-limit";
import { POST } from "@/app/api/aspirasi/route";
import { TurnstileVerificationError } from "./turnstile";

const body = {
  categoryId: "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d",
  chronology: "Kondisi ruang perlu diperiksa.",
  contactAllowed: false,
  evidence: [],
  email: "student@example.test",
  ethicsAccepted: true,
  honeypot: "",
  identityMode: "CONFIDENTIAL_BEM_ONLY",
  impact: "Kegiatan belajar terganggu.",
  limitedShareConsent: false,
  location: "Ruang contoh",
  name: "Mahasiswa QA",
  nim: "2411500001",
  suggestedSolution: "Periksa fasilitas.",
  title: "Fasilitas ruang belajar",
  turnstileToken: "test-token",
  whatsapp: "081200000000",
};
const request = (overrides = {}) =>
  new Request("https://example.test/api/aspirasi", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "idempotency-key": randomUUID(),
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
    expect(mocks.consume).toHaveBeenCalledTimes(1);
    expect(mocks.consume).toHaveBeenCalledWith(submissionRateLimit, "unknown");
  });
  it("charges global capacity only after a successful challenge", async () => {
    mocks.submit.mockResolvedValue({
      trackingCode: "synthetic",
      trackingSecret: "synthetic",
    });
    mocks.verify.mockImplementation(() => {
      expect(mocks.consume).not.toHaveBeenCalledWith(
        submissionCircuitBreaker,
        "all-submissions",
      );
    });
    expect((await POST(request())).status).toBe(201);
    expect(mocks.consume).toHaveBeenCalledWith(
      submissionCircuitBreaker,
      "all-submissions",
    );
  });
  it("still rejects verified requests when global capacity is exhausted", async () => {
    mocks.consume.mockImplementation((rule) => {
      if (rule === submissionCircuitBreaker) throw new PublicRateLimitError(60);
    });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(mocks.evidence).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
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
