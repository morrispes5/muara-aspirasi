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
  email: "MAHASISWA@EXAMPLE.TEST",
  ethicsAccepted: true,
  honeypot: "",
  identityMode: "CONFIDENTIAL_BEM_ONLY",
  impact: "Mahasiswa sulit fokus saat kuliah berlangsung.",
  limitedShareConsent: false,
  location: "Gedung A lantai 3",
  name: "  Mahasiswa   Contoh  ",
  nim: "20-12345",
  suggestedSolution: "Periksa AC dan jadwal perawatannya.",
  title: "AC ruang A-301 mati",
  turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  whatsapp: "+62 812-0000-0000",
};

describe("public aspiration validation", () => {
  it("normalizes a valid submission and preserves the confidential default", () => {
    expect(parseSubmissionInput(validSubmission)).toMatchObject({
      email: "mahasiswa@example.test",
      identityMode: "CONFIDENTIAL_BEM_ONLY",
      name: "Mahasiswa Contoh",
      nim: "20-12345",
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
});
