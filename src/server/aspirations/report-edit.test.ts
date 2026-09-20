import { expect, it, vi } from "vitest";
import type { Database } from "@/server/db/client";
import { editReportContent } from "./case-management";
const fields = {
  name: "Student QA",
  nim: "0012345678",
  email: "student@example.test",
  whatsapp: "081200000000",
  title: "Judul",
  location: "Ruang",
  chronology: "Kronologi",
  impact: "Dampak",
  suggestedSolution: "Usulan",
};
const now = new Date("2026-09-20T00:00:00Z");
function database(archivedAt: Date | null = null) {
  const writes: unknown[] = [];
  const inserts: unknown[] = [];
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            { archivedAt, updatedAt: now, status: "RECEIVED" },
          ],
        }),
      }),
    }),
    update: vi.fn(() => ({
      set: (values: unknown) => {
        writes.push(values);
        return {
          where: () => ({
            returning: async () => [
              { updatedAt: new Date(now.getTime() + 1), id: "identity" },
            ],
          }),
        };
      },
    })),
    insert: () => ({
      values: async (values: unknown) => {
        inserts.push(values);
      },
    }),
  };
  return {
    db: {
      transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
    } as unknown as Database,
    tx,
    writes,
    inserts,
  };
}
const input = {
  actorUserId: "owner",
  reportId: "00000000-0000-4000-8000-000000000001",
  expectedUpdatedAt: now.toISOString(),
  reason: "Koreksi dikonfirmasi mahasiswa",
  fields,
};
it("rejects stale edits before writes", async () => {
  const d = database();
  await expect(
    editReportContent(
      { ...input, expectedUpdatedAt: "2026-09-19T00:00:00Z" },
      d.db,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(d.tx.update).not.toHaveBeenCalled();
});
it("blocks edits to archived reports", async () => {
  const d = database(now);
  await expect(editReportContent(input, d.db)).rejects.toMatchObject({
    code: "REPORT_ARCHIVED",
  });
  expect(d.tx.update).not.toHaveBeenCalled();
});
it("updates content and identity but never consent or tracking credentials", async () => {
  const d = database();
  await editReportContent(input, d.db);
  expect(d.writes).toHaveLength(2);
  expect(d.writes[1]).toEqual({
    name: fields.name,
    nim: fields.nim,
    email: fields.email,
    whatsapp: fields.whatsapp,
  });
  expect(JSON.stringify(d.writes)).not.toMatch(/tracking|consent|identityMode/);
  expect(d.inserts[0]).toMatchObject({
    action: "REPORT_CONTENT_CORRECTED",
    actorUserId: "owner",
  });
  expect(JSON.stringify(d.inserts[0])).not.toContain(fields.email);
});
