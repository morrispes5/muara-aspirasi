import { expect, it } from "vitest";
import { createReportWorkbook } from "./report-export";
import ExcelJS from "exceljs";
import type { ReportQueueItem } from "./case-management";
it("exports real XLSX preserving NIM and keeping formula-like inputs as text", async () => {
  const row: ReportQueueItem = {
    id: "report",
    trackingCode: "MA-0123456789ABCDEF",
    identity: {
      name: '=HYPERLINK("https://example.test")',
      nim: "00123456789012345678",
      email: "student@example.test",
    },
    archivedAt: null,
    assignment: null,
    category: { id: "cat", name: "Saran" },
    location: "Ruang",
    status: "RECEIVED",
    submittedAt: "2026-09-20T00:00:00Z",
    title: "+1+1",
    updatedAt: "2026-09-20T00:00:00Z",
    urgency: "NORMAL",
  };
  const bytes = await createReportWorkbook([row]);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.getWorksheet("Aspirasi")!;
  expect(sheet.getCell("C2").value).toBe(row.identity!.nim);
  expect(sheet.getCell("B2").type).toBe(ExcelJS.ValueType.String);
  expect(sheet.getCell("E2").value).toBe("+1+1");
  expect(sheet.getCell("B2").formula).toBeUndefined();
  expect(sheet.columnCount).toBe(9);
  expect(JSON.stringify(sheet.model)).not.toMatch(
    /trackingSecret|internalNotes|objectKey/,
  );
});
