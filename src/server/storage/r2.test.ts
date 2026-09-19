import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { S3Client } from "@aws-sdk/client-s3";

import {
  collectEvidenceBodyWithinLimit,
  createEvidenceDownloadUrl,
  createEvidenceUploadUrl,
  createFinalEvidenceObjectKey,
  finalizeEvidenceObject,
  R2ObjectSizeError,
  R2StorageError,
} from "@/server/storage/r2";

const stagingKey = "evidence/quarantine/00000000-0000-4000-8000-000000000001";

async function* chunks(...values: number[][]) {
  for (const value of values) yield Uint8Array.from(value);
}

describe("private R2 evidence boundary", () => {
  beforeEach(() => {
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("R2_ACCOUNT_ID", "test-account");
    vi.stubEnv("R2_EVIDENCE_BUCKET", "test-bucket");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key-not-placeholder");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("binds the approved byte count into the presigned PUT", async () => {
    const uploadUrl = await createEvidenceUploadUrl({
      mimeType: "image/png",
      objectKey: stagingKey,
      sizeBytes: 123,
    });
    const signedHeaders = new URL(uploadUrl).searchParams.get(
      "X-Amz-SignedHeaders",
    );

    expect(signedHeaders?.split(";")).toContain("content-length");
  });

  it("stops reading as soon as the byte ceiling is exceeded", async () => {
    await expect(
      collectEvidenceBodyWithinLimit(chunks([1, 2], [3, 4]), 3),
    ).rejects.toBeInstanceOf(R2ObjectSizeError);
    await expect(
      collectEvidenceBodyWithinLimit(chunks([1, 2], [3]), 3),
    ).resolves.toEqual(Buffer.from([1, 2, 3]));
  });

  it("copies validated bytes to a server-only final key and removes staging", async () => {
    const send = vi
      .spyOn(S3Client.prototype, "send")
      .mockResolvedValue({} as never);
    const bytes = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

    const finalKey = await finalizeEvidenceObject({
      bytes,
      mimeType: "application/pdf",
      stagingObjectKey: stagingKey,
    });

    expect(finalKey).toMatch(/^evidence\/final\/[0-9a-f-]{36}$/i);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0].input).toEqual(
      expect.objectContaining({
        Body: bytes,
        ContentLength: bytes.byteLength,
        Key: finalKey,
      }),
    );
    expect(send.mock.calls[1]?.[0].input).toEqual(
      expect.objectContaining({ Key: stagingKey }),
    );
  });

  it("never creates a BEM download URL for a browser-writable staging key", async () => {
    await expect(createEvidenceDownloadUrl(stagingKey)).rejects.toBeInstanceOf(
      R2StorageError,
    );
    expect(createFinalEvidenceObjectKey()).toMatch(
      /^evidence\/final\/[0-9a-f-]{36}$/i,
    );
  });
});
