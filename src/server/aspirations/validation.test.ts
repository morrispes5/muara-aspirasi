import { describe, expect, it } from "vitest";
import {
  parseSubmissionInput,
  parseTrackingInput,
  PublicInputError,
} from "@/server/aspirations/validation";

const validSubmission = {
  categoryId: "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d",
  chronology: "AC ruang kelas mati selama dua pertemuan.",
  contactAllowed: true,
  evidence: [],
  email: "MAHASISWA@EXAMPLE.TEST",
  ethicsAccepted: true,
  honeypot: "",
  identityMode: "CONFIDENTIAL_BEM_ONLY",
  impact: "Mahasiswa sulit fokus saat kuliah berlangsung.",
  limitedShareConsent: false,
  location: "Gedung A lantai 3",
  name: "  Mahasiswa   Contoh  ",
  nim: "2411500001",
  suggestedSolution: "Periksa AC dan jadwal perawatannya.",
  title: "AC ruang A-301 mati",
  turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  whatsapp: "+62 812-0000-0000",
};

describe("public aspiration validation", () => {
  it.each(["123456", "abc1234567", "123456-7", "123456789012345678901"])(
    "rejects invalid NIM %s",
    (nim) => {
      expect(() => parseSubmissionInput({ ...validSubmission, nim })).toThrow(
        PublicInputError,
      );
    },
  );
  it.each([
    "name",
    "nim",
    "email",
    "whatsapp",
    "title",
    "location",
    "chronology",
    "impact",
    "suggestedSolution",
  ])("requires %s on the server", (field) => {
    expect(() =>
      parseSubmissionInput({ ...validSubmission, [field]: " " }),
    ).toThrow(PublicInputError);
  });
  it.each(["1234567", "0012345678", "12345678901234567890"])(
    "preserves numeric NIM %s as text",
    (nim) => {
      expect(parseSubmissionInput({ ...validSubmission, nim }).nim).toBe(nim);
    },
  );
  it("normalizes a valid submission and preserves the confidential default", () => {
    expect(parseSubmissionInput(validSubmission)).toMatchObject({
      email: "mahasiswa@example.test",
      identityMode: "CONFIDENTIAL_BEM_ONLY",
      name: "Mahasiswa Contoh",
      nim: "2411500001",
    });
  });

  it("rejects unexpected, oversized, and malformed public input", () => {
    expect(() =>
      parseSubmissionInput({ ...validSubmission, injected: "nope" }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({ ...validSubmission, title: "x".repeat(201) }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({ ...validSubmission, nim: "20/12345" }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({ ...validSubmission, email: "bukan-email" }),
    ).toThrow(PublicInputError);
  });

  it("requires explicit limited-share and ethics consent", () => {
    expect(() =>
      parseSubmissionInput({
        ...validSubmission,
        identityMode: "CONSENTED_LIMITED_SHARE",
        limitedShareConsent: false,
      }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({ ...validSubmission, ethicsAccepted: false }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({
        ...validSubmission,
        contactAllowed: true,
        email: null,
        whatsapp: null,
      }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({ ...validSubmission, honeypot: null }),
    ).toThrow(PublicInputError);
  });

  it("requires exact tracking credential input without extra fields", () => {
    expect(
      parseTrackingInput({
        trackingCode: "ma-1234abcd5678ef90",
        trackingSecret: "a-secret-token",
      }),
    ).toEqual({
      trackingCode: "MA-1234ABCD5678EF90",
      trackingSecret: "a-secret-token",
    });
    expect(() =>
      parseTrackingInput({
        extra: true,
        trackingCode: "MA-1234ABCD5678EF90",
        trackingSecret: "a-secret-token",
      }),
    ).toThrow(PublicInputError);
  });

  it("accepts only opaque UUID evidence handles", () => {
    const intentId = "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d";
    expect(
      parseSubmissionInput({
        ...validSubmission,
        evidence: [{ intentId }],
      }).evidence,
    ).toEqual([{ intentId }]);
    expect(() =>
      parseSubmissionInput({
        ...validSubmission,
        evidence: [{ intentId: "not-a-uuid" }],
      }),
    ).toThrow(PublicInputError);
    expect(() =>
      parseSubmissionInput({
        ...validSubmission,
        evidence: [{ intentId, objectKey: "must-not-be-client-controlled" }],
      }),
    ).toThrow(PublicInputError);
  });
});
