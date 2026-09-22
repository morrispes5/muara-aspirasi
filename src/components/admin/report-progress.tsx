import type {
  ReportDetail,
  ReportReasonCode,
  ReportStatus,
} from "@/server/aspirations/case-management";
import { Card } from "@/components/ui/card";

const labels: Record<ReportStatus, string> = {
  RECEIVED: "Laporan diterima",
  UNDER_REVIEW: "Sedang ditinjau BEM",
  NEEDS_CLARIFICATION: "Perlu klarifikasi",
  IN_COORDINATION: "Dalam koordinasi",
  UPDATE_AVAILABLE: "Pembaruan tersedia",
  ACTION_TAKEN: "Tindakan dilakukan",
  RESOLVED: "Selesai",
  CANNOT_PROCESS: "Tidak dapat diproses",
};

const reasons: Record<ReportReasonCode, string> = {
  DUPLICATE_REPORT: "Laporan duplikat",
  INSUFFICIENT_INFORMATION: "Informasi belum cukup",
  OPERATIONAL_CORRECTION: "Koreksi operasional",
  OUT_OF_SCOPE: "Di luar ruang lingkup",
  POLICY_VIOLATION: "Melanggar kebijakan pelaporan",
  SAFETY_ESCALATION: "Perlu eskalasi keselamatan",
};

const guidance: Record<ReportStatus, string> = {
  RECEIVED: "Periksa isi aspirasi, lalu mulai tinjauan BEM.",
  UNDER_REVIEW:
    "Tentukan apakah perlu klarifikasi atau koordinasi dengan pihak terkait.",
  NEEDS_CLARIFICATION:
    "Tunggu informasi tambahan melalui kanal yang disepakati, lalu lanjutkan tinjauan.",
  IN_COORDINATION:
    "Catat perkembangan koordinasi dan kabarkan hasilnya kepada mahasiswa.",
  UPDATE_AVAILABLE:
    "Lanjutkan koordinasi atau catat tindakan yang sudah dilakukan.",
  ACTION_TAKEN: "Periksa hasil tindakan sebelum menandai laporan selesai.",
  RESOLVED:
    "Penanganan selesai. Riwayat tetap tersimpan dan laporan dapat diarsipkan.",
  CANNOT_PROCESS:
    "Penanganan dihentikan. Pastikan alasan dan kabar untuk mahasiswa sudah jelas.",
};

function date(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function ReportProgress({ detail }: { detail: ReportDetail }) {
  const events = [...detail.statusEvents].reverse();
  const latestMessage = events.find(
    (event) => event.isReporterVisible && event.reporterMessage,
  );

  return (
    <Card>
      <h2 className="text-ink text-xl font-bold">
        Progres & riwayat tanggapan
      </h2>
      <div className="bg-brand-soft rounded-control mt-4 p-4">
        <p className="font-bold">
          Status saat ini: {labels[detail.report.status]}
        </p>
        <p className="mt-1 text-sm">
          {detail.report.archivedAt
            ? "Laporan diarsipkan. Buka kembali sebelum melakukan tindak lanjut."
            : guidance[detail.report.status]}
        </p>
        <p className="text-muted mt-2 text-xs">
          Terakhir diperbarui: {date(detail.report.updatedAt)} WIB
        </p>
      </div>
      <div className="border-line mt-4 border-b pb-4">
        <h3 className="text-sm font-bold">Kabar terakhir untuk mahasiswa</h3>
        <p className="mt-2 text-sm whitespace-pre-wrap">
          {latestMessage?.reporterMessage ??
            "Belum ada kabar yang ditulis untuk mahasiswa."}
        </p>
        <p className="text-muted mt-2 text-xs">
          {latestMessage
            ? `Tersedia di halaman pelacakan sejak ${date(latestMessage.createdAt)} WIB. Belum ada tanda dibaca; ini bukan notifikasi email/WhatsApp.`
            : "Tulis kabar pada formulir Tindak lanjut agar mahasiswa dapat membacanya di halaman pelacakan."}
        </p>
      </div>
      <ol className="mt-4 grid gap-4" aria-label="Riwayat status dan tanggapan">
        {events.map((event, index) => (
          <li
            key={`${event.createdAt}-${index}`}
            className="border-line border-l-2 pl-4"
          >
            <p className="text-sm font-bold">
              {event.fromStatus &&
              event.toStatus &&
              event.fromStatus !== event.toStatus
                ? `${labels[event.fromStatus]} → ${labels[event.toStatus]}`
                : event.reporterMessage
                  ? "Kabar untuk mahasiswa ditambahkan"
                  : event.toStatus
                    ? labels[event.toStatus]
                    : "Pembaruan laporan"}
            </p>
            <p className="text-muted mt-1 text-xs">
              <time dateTime={event.createdAt}>
                {date(event.createdAt)} WIB
              </time>{" "}
              · {event.actorName ?? "Sistem penerimaan"}
            </p>
            {event.reasonCode && (
              <p className="mt-2 text-xs">
                Alasan:{" "}
                {reasons[event.reasonCode as ReportReasonCode] ??
                  event.reasonCode}
              </p>
            )}
            {event.reporterMessage && (
              <p className="mt-2 text-sm whitespace-pre-wrap">
                {event.reporterMessage}
              </p>
            )}
            <p className="text-muted mt-1 text-xs">
              {event.isReporterVisible
                ? "Kabar tersedia di pelacakan mahasiswa"
                : "Catatan peristiwa internal BEM"}
            </p>
          </li>
        ))}
        {!events.length && (
          <li className="text-muted text-sm">
            Belum ada riwayat tindak lanjut.
          </li>
        )}
      </ol>
    </Card>
  );
}
