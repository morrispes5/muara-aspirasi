import { describe, expect, it } from "vitest";

import {
  checksumEvidence,
  EvidenceValidationError,
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_TOTAL_BYTES,
  validateEvidenceBytes,
  validateEvidenceFileDescriptors,
} from "@/server/aspirations/evidence";

describe("evidence validation", () => {
  it("accepts the narrow file allowlist and normalizes descriptors", () => {
    const result = validateEvidenceFileDescriptors([
      { name: "  ruang.png ", size: 8, type: "image/png" },
      { name: "surat.pdf", size: 12, type: "application/pdf" },
    ]);

    expect(result.files).toEqual([
      { name: "ruang.png", size: 8, type: "image/png" },
      { name: "surat.pdf", size: 12, type: "application/pdf" },
    ]);
  });

  it("rejects count, size, extension, and unsupported-type violations", () => {
    expect(() =>
      validateEvidenceFileDescriptors([
        { name: "a.pdf", size: 1, type: "application/pdf" },
        { name: "b.pdf", size: 1, type: "application/pdf" },
        { name: "c.pdf", size: 1, type: "application/pdf" },
        { name: "d.pdf", size: 1, type: "application/pdf" },
      ]),
    ).toThrow(EvidenceValidationError);
    expect(() =>
      validateEvidenceFileDescriptors([
        {
          name: "a.pdf",
          size: MAX_EVIDENCE_FILE_BYTES + 1,
          type: "application/pdf",
        },
      ]),
    ).toThrow(EvidenceValidationError);
    expect(() =>
      validateEvidenceFileDescriptors([
        {
          name: "a.pdf",
          size: MAX_EVIDENCE_TOTAL_BYTES,
          type: "application/pdf",
        },
        { name: "b.pdf", size: 1, type: "application/pdf" },
      ]),
    ).toThrow(EvidenceValidationError);
    expect(() =>
      validateEvidenceFileDescriptors([
        { name: "a.exe", size: 1, type: "application/pdf" },
      ]),
    ).toThrow(EvidenceValidationError);
    expect(() =>
      validateEvidenceFileDescriptors([
        { name: "a.txt", size: 1, type: "text/plain" },
      ]),
    ).toThrow(EvidenceValidationError);
  });

  it("checks magic bytes before accepting an object", () => {
    expect(() =>
      validateEvidenceBytes(
        "image/png",
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).not.toThrow();
    expect(() =>
      validateEvidenceBytes(
        "application/pdf",
        Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      ),
    ).not.toThrow();
    expect(() =>
      validateEvidenceBytes("image/jpeg", Uint8Array.from([0x89, 0x50, 0x4e])),
    ).toThrow(EvidenceValidationError);
  });

  it("creates a stable SHA-256 checksum", () => {
    expect(checksumEvidence(new TextEncoder().encode("muara"))).toBe(
      "c54490c65d23ae4e58c97fe48c7c2976258365ffc64a7659637d700975e1e3d9",
    );
  });
});
