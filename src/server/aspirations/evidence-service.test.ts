import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checksumEvidence } from "@/server/aspirations/evidence";
import { type Database } from "@/server/db/client";

const storageMocks = vi.hoisted(() => ({
  createEvidenceDownloadUrl: vi.fn(),
  createEvidenceUploadUrl: vi.fn(),
  deleteEvidenceObject: vi.fn(),
  inspectEvidenceObject: vi.fn(),
  isR2EvidenceEnabled: vi.fn(() => true),
  readEvidenceObject: vi.fn(),
  writeFinalEvidenceObject: vi.fn(),
}));

vi.mock("@/server/storage/r2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/storage/r2")>()),
  ...storageMocks,
}));

import {
  createEvidenceUploadIntents,
  getEvidenceDownloadLink,
} from "@/server/aspirations/evidence-service";

const legacyKey = "evidence/quarantine/00000000-0000-4000-8000-000000000001";
const finalKey = "evidence/final/00000000-0000-4000-8000-000000000002";
const reportId = "00000000-0000-4000-8000-000000000003";
const evidenceId = "00000000-0000-4000-8000-000000000004";
const pdfBytes = Buffer.from("%PDF-test-evidence");

function legacyDownloadDatabase() {
  const returning = vi.fn().mockResolvedValue([{ objectKey: finalKey }]);
  const updateWhere = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));
  const limit = vi.fn().mockResolvedValue([
    {
      checksumSha256: checksumEvidence(pdfBytes),
      id: evidenceId,
      mimeType: "application/pdf",
      objectKey: legacyKey,
      sizeBytes: pdfBytes.byteLength,
    },
  ]);
  const where = vi.fn(() => ({ limit }));
  const innerJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ innerJoin }));
  const select = vi.fn(() => ({ from }));

  return {
    database: { select, update } as unknown as Database,
    returning,
    set,
    update,
  };
}

describe("evidence object lifecycle", () => {
  beforeEach(() => {
    storageMocks.isR2EvidenceEnabled.mockReturnValue(true);
    storageMocks.createEvidenceDownloadUrl.mockResolvedValue(
      "https://private.example/download",
    );
    storageMocks.createEvidenceUploadUrl.mockResolvedValue(
      "https://private.example/upload",
    );
    storageMocks.deleteEvidenceObject.mockResolvedValue(undefined);
    storageMocks.writeFinalEvidenceObject.mockResolvedValue(finalKey);
    storageMocks.readEvidenceObject.mockResolvedValue({
      bytes: pdfBytes,
      contentLength: pdfBytes.byteLength,
      contentType: "application/pdf",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("migrates an integrity-checked legacy quarantine object before download", async () => {
    const { database, set } = legacyDownloadDatabase();

    await expect(
      getEvidenceDownloadLink(reportId, evidenceId, database),
    ).resolves.toBe("https://private.example/download");

    expect(storageMocks.readEvidenceObject).toHaveBeenCalledWith(
      legacyKey,
      pdfBytes.byteLength,
    );
    expect(storageMocks.writeFinalEvidenceObject).toHaveBeenCalledWith({
      bytes: pdfBytes,
      mimeType: "application/pdf",
    });
    expect(set).toHaveBeenCalledWith({ objectKey: finalKey });
    expect(storageMocks.deleteEvidenceObject).toHaveBeenCalledWith(legacyKey);
    expect(storageMocks.createEvidenceDownloadUrl).toHaveBeenCalledWith(
      finalKey,
    );
  });

  it("refuses a legacy object whose persisted checksum no longer matches", async () => {
    const { database, update } = legacyDownloadDatabase();
    storageMocks.readEvidenceObject.mockResolvedValue({
      bytes: Buffer.from("%PDF-tampered"),
      contentLength: pdfBytes.byteLength,
      contentType: "application/pdf",
    });

    await expect(
      getEvidenceDownloadLink(reportId, evidenceId, database),
    ).rejects.toMatchObject({ code: "INVALID" });

    expect(update).not.toHaveBeenCalled();
    expect(storageMocks.createEvidenceDownloadUrl).not.toHaveBeenCalled();
  });

  it("removes replayable staging objects after expiry, including consumed intents", async () => {
    const consumedId = "00000000-0000-4000-8000-000000000005";
    const unusedId = "00000000-0000-4000-8000-000000000006";
    const consumedKey =
      "evidence/quarantine/00000000-0000-4000-8000-000000000007";
    const unusedKey =
      "evidence/quarantine/00000000-0000-4000-8000-000000000008";
    const limit = vi.fn().mockResolvedValue([
      { consumedAt: new Date(), id: consumedId, objectKey: consumedKey },
      { consumedAt: null, id: unusedId, objectKey: unusedKey },
    ]);
    const selectWhere = vi.fn(() => ({ limit }));
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    const select = vi.fn(() => ({ from: selectFrom }));
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const deleteRow = vi.fn(() => ({ where: deleteWhere }));
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set }));
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const database = {
      delete: deleteRow,
      insert,
      select,
      update,
    } as unknown as Database;

    await createEvidenceUploadIntents(
      [{ name: "evidence.pdf", size: 123, type: "application/pdf" }],
      database,
    );

    expect(storageMocks.deleteEvidenceObject).toHaveBeenCalledWith(consumedKey);
    expect(storageMocks.deleteEvidenceObject).toHaveBeenCalledWith(unusedKey);
    expect(deleteRow).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({
      stagingDeletedAt: expect.any(Date),
    });
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
