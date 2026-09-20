import ExcelJS from "exceljs";
import type { ReportQueueItem } from "./case-management";

export async function createReportWorkbook(items: ReportQueueItem[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Aspirasi", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = [
    { header: "Kode", key: "code", width: 24 },
    { header: "Nama", key: "name", width: 28 },
    { header: "NIM", key: "nim", width: 24, style: { numFmt: "@" } },
    { header: "Email", key: "email", width: 38 },
    { header: "Judul", key: "title", width: 48 },
    { header: "Kategori", key: "category", width: 26 },
    { header: "Status", key: "status", width: 24 },
    { header: "Tanggal (WIB)", key: "date", width: 28 },
    { header: "Arsip", key: "archive", width: 14 },
  ];
  for (const item of items) {
    // Plain string cells only: never construct a formula or hyperlink from input.
    sheet.addRow({
      code: item.trackingCode,
      name: item.identity?.name ?? "",
      nim: item.identity?.nim ?? "",
      email: item.identity?.email ?? "",
      title: item.title,
      category: item.category.name,
      status: item.status,
      date: new Date(item.submittedAt).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      }),
      archive: item.archivedAt ? "Ya" : "Tidak",
    });
  }
  sheet.autoFilter = "A1:I1";
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B86" },
  };
  sheet.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  return workbook.xlsx.writeBuffer();
}
