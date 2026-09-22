"use client";

import type {
  BemAssignee,
  ReportQueueItem,
  ReportQueueResult,
} from "@/server/aspirations/case-management";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { nimPattern } from "@/lib/report-fields";

type Props = {
  assignees: BemAssignee[];
  categories: Array<{ id: string; name: string }>;
  initial: ReportQueueResult;
};
const statuses: Record<string, string> = {
  RECEIVED: "Baru masuk",
  UNDER_REVIEW: "Ditinjau",
  NEEDS_CLARIFICATION: "Perlu klarifikasi",
  IN_COORDINATION: "Dikoordinasikan",
  UPDATE_AVAILABLE: "Ada pembaruan",
  ACTION_TAKEN: "Sudah ditindak",
  RESOLVED: "Selesai",
  CANNOT_PROCESS: "Tidak diproses",
};
const field =
  "rounded-control border-line bg-surface text-ink w-full min-h-11 border px-3 py-2 text-sm";
const button =
  "rounded-control border-line min-h-11 border px-4 py-2 text-sm font-bold disabled:opacity-50";
const initialFilters = {
  search: "",
  status: "",
  categoryId: "",
  archived: "ACTIVE",
  fromDate: "",
  toDate: "",
};

export function ReportQueue({ categories, initial }: Props) {
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const first = useRef(true);
  const query = new URLSearchParams({
    ...filters,
    page: String(page),
    pageSize: "25",
  }).toString();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/reports?" + query, {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok || !body.reports)
          throw new Error(body.error?.message ?? "Tabel belum dapat dimuat.");
        if (!controller.signal.aborted) setResult(body.reports);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Tabel gagal dimuat.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query, revision]);

  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    const applied = {
      ...draft,
      search: draft.search.trim().replace(/\s+/gu, " "),
    };
    setDraft(applied);
    setFilters(applied);
    setRevision((v) => v + 1);
  }
  async function exportExcel() {
    if (
      !window.confirm(
        "Unduh nama, NIM dan email sesuai filter tabel? File berisi data privat. Simpan di perangkat pribadi dan jangan unggah ke tempat publik.",
      )
    )
      return;
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: query }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Ekspor gagal.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "muara-aspirasi.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Excel diunduh sesuai filter, termasuk halaman lain. Simpan sebagai data privat.",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ekspor gagal.");
    } finally {
      setExporting(false);
    }
  }
  async function archive(item: ReportQueueItem) {
    if (
      !window.confirm(
        (item.archivedAt ? "Pulihkan" : "Arsipkan") +
          " laporan ini? Tidak ada penghapusan permanen. Tindakan dicatat sebagai koreksi operasional.",
      )
    )
      return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reports/" + item.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: item.archivedAt ? "reopen" : "archive",
          expectedUpdatedAt: item.updatedAt,
          reasonCode: "OPERATIONAL_CORRECTION",
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Tindakan gagal.");
      }
      setNotice(
        item.archivedAt
          ? "Laporan dipulihkan untuk ditinjau."
          : "Laporan dipindahkan ke arsip. Bisa dipulihkan.",
      );
      setRevision((v) => v + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Tindakan gagal.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-brand text-xs font-bold tracking-widest uppercase">
            Ruang kerja BEM · Privat
          </p>
          <h1 className="text-ink mt-2 text-3xl font-bold">
            Aspirasi mahasiswa
          </h1>
          <p className="text-muted mt-2 text-sm">
            Cari mahasiswa, buka laporan, lalu kirim pembaruan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={button + " bg-brand text-white"}
            href="/admin/laporan/baru"
          >
            + Tambah laporan
          </Link>
          <button
            className={button}
            type="button"
            disabled={loading || exporting || !!error}
            onClick={exportExcel}
          >
            {exporting ? "Menyiapkan…" : "Ekspor Excel (.xlsx)"}
          </button>
        </div>
      </header>
      <p className="text-muted text-xs leading-5">
        Nama, NIM dan email hanya untuk pengelolaan BEM. Data lama yang kosong
        ditampilkan sebagai —. Ekspor tidak menyertakan token atau catatan
        internal.
      </p>
      <form
        className="border-line bg-surface rounded-card grid gap-3 border p-4"
        onSubmit={apply}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
          <label className="grid gap-1 text-sm font-bold">
            Cari aspirasi
            <input
              className={field}
              placeholder="Nama, NIM, email, judul, atau kode"
              maxLength={80}
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Status
            <select
              className={field}
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              <option value="">Semua status</option>
              {Object.entries(statuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className={button + " bg-brand self-end text-white"}
            disabled={loading}
            type="submit"
          >
            Cari / terapkan
          </button>
        </div>
        <p className="text-muted text-xs">
          Cari dengan NIM atau sebagian nama. Jika tidak ada hasil persis,
          kemungkinan salah ketik ditampilkan terpisah untuk diperiksa.
        </p>
        {JSON.stringify(draft) !== JSON.stringify(filters) && (
          <p className="text-warning text-sm" role="status">
            Isian berubah. Tekan Cari / terapkan untuk memperbarui hasil.
          </p>
        )}
        <details>
          <summary className="text-brand cursor-pointer py-2 text-sm font-bold">
            Filter tanggal, kategori & arsip
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Kategori
              <select
                className={field}
                value={draft.categoryId}
                onChange={(e) =>
                  setDraft({ ...draft, categoryId: e.target.value })
                }
              >
                <option value="">Semua kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Tampilkan
              <select
                className={field}
                value={draft.archived}
                onChange={(e) =>
                  setDraft({ ...draft, archived: e.target.value })
                }
              >
                <option value="ACTIVE">Laporan aktif</option>
                <option value="ARCHIVED">Arsip / terhapus</option>
                <option value="ALL">Semua laporan</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Dari tanggal
              <input
                className={field}
                type="date"
                value={draft.fromDate}
                max={draft.toDate || undefined}
                onChange={(e) =>
                  setDraft({ ...draft, fromDate: e.target.value })
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              Sampai tanggal
              <input
                className={field}
                type="date"
                value={draft.toDate}
                min={draft.fromDate || undefined}
                onChange={(e) => setDraft({ ...draft, toDate: e.target.value })}
              />
            </label>
          </div>
        </details>
        <div>
          <button
            className="text-muted text-sm underline"
            type="button"
            disabled={loading}
            onClick={() => {
              setDraft(initialFilters);
              setFilters(initialFilters);
              setPage(1);
              setRevision((v) => v + 1);
            }}
          >
            Reset filter
          </button>
        </div>
      </form>
      {notice && (
        <p
          role="status"
          className="bg-success-soft text-success rounded-control p-3 text-sm"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="bg-danger-soft text-danger rounded-control p-3 text-sm"
        >
          {error}{" "}
          <button
            className="underline"
            onClick={() => setRevision((v) => v + 1)}
          >
            Muat ulang
          </button>
        </p>
      )}
      <p className="text-muted text-xs">
        Filter diterapkan: {filters.search ? `“${filters.search}” · ` : ""}
        {filters.archived === "ACTIVE"
          ? "laporan aktif"
          : filters.archived === "ARCHIVED"
            ? "laporan arsip"
            : "aktif dan arsip"}
        {filters.status ? ` · ${statuses[filters.status]}` : " · semua status"}
        {filters.categoryId
          ? ` · ${categories.find((item) => item.id === filters.categoryId)?.name ?? "kategori dipilih"}`
          : ""}
        {filters.fromDate ? ` · dari ${filters.fromDate}` : ""}
        {filters.toDate ? ` · sampai ${filters.toDate}` : ""}
      </p>
      <p role="status" className="text-muted text-sm">
        {loading
          ? "Memuat laporan…"
          : error
            ? "Hasil belum dapat dimuat. Coba muat ulang."
            : result.suggestions?.items.length
              ? `${result.suggestions.totalMatches} kandidat mirip ditemukan; tidak ada kecocokan persis.`
              : result.totalItems + " laporan sesuai filter"}
      </p>
      {!error && !result.suggestions?.items.length && (
        <div
          className="border-line rounded-control max-w-full overflow-x-auto border"
          tabIndex={0}
          role="region"
          aria-label="Tabel aspirasi, geser untuk melihat semua kolom"
        >
          <table className="text-ink w-full min-w-[1000px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Aspirasi mahasiswa, data privat BEM
            </caption>
            <thead className="bg-brand-soft text-ink">
              <tr>
                {[
                  "Mahasiswa",
                  "NIM",
                  "Email",
                  "Aspirasi",
                  "Status",
                  "Diterima",
                  "Tindakan",
                ].map((label) => (
                  <th
                    scope="col"
                    key={label}
                    className="border-line border-b px-3 py-3"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id} className="even:bg-canvas">
                  <td className="border-line border-b px-3 py-4">
                    {item.identity?.name ?? "—"}
                  </td>
                  <td className="border-line border-b px-3 py-4 font-mono">
                    {item.identity?.nim ?? "—"}
                    {item.identity && !nimPattern.test(item.identity.nim) && (
                      <p className="text-warning mt-1 text-xs">
                        Periksa NIM: format bukan 10 angka.
                      </p>
                    )}
                  </td>
                  <td className="border-line border-b px-3 py-4 break-all">
                    {item.identity?.email ?? "—"}
                  </td>
                  <td className="border-line max-w-64 border-b px-3 py-4">
                    <Link
                      className="text-brand font-bold underline"
                      href={"/admin/laporan/" + item.id}
                    >
                      {item.title}
                    </Link>
                    <p className="text-muted mt-1 text-xs">
                      {item.trackingCode} · {item.category.name}
                    </p>
                  </td>
                  <td className="border-line border-b px-3 py-4">
                    <span className="bg-brand-soft rounded px-2 py-1 text-xs font-bold">
                      {statuses[item.status]}
                    </span>
                    {item.archivedAt && (
                      <p className="mt-1 text-xs">Diarsipkan</p>
                    )}
                  </td>
                  <td className="border-line border-b px-3 py-4 text-xs">
                    {new Date(item.submittedAt).toLocaleDateString("id-ID", {
                      timeZone: "Asia/Jakarta",
                    })}
                  </td>
                  <td className="border-line border-b px-3 py-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        className="text-brand font-bold underline"
                        href={"/admin/laporan/" + item.id}
                      >
                        Lihat / edit
                      </Link>
                      <button
                        disabled={loading}
                        className="text-muted text-left text-xs underline"
                        type="button"
                        onClick={() => archive(item)}
                      >
                        {item.archivedAt ? "Pulihkan" : "Hapus ke arsip"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!result.items.length && (
                <tr>
                  <td colSpan={7} className="text-muted p-8 text-center">
                    <p>
                      Tidak ada laporan yang cocok dengan filter diterapkan.
                    </p>
                    <p className="mt-2 text-xs">
                      {filters.search && /^\d+$/.test(filters.search)
                        ? `NIM yang dicari: ${filters.search.length} digit. Periksa kandidat di bawah atau coba sebagian nama.`
                        : "Coba sebagian nama dan periksa status, tanggal, kategori, serta arsip."}
                    </p>
                    <button
                      type="button"
                      disabled={loading}
                      className="text-brand mt-3 font-bold underline"
                      onClick={() => {
                        const next = {
                          ...initialFilters,
                          search: filters.search,
                          archived: "ALL",
                        };
                        setDraft(next);
                        setFilters(next);
                        setPage(1);
                        setRevision((v) => v + 1);
                      }}
                    >
                      Cari di semua status & arsip
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!loading &&
        !error &&
        result.suggestions &&
        (result.suggestions.items.length > 0 ||
          result.suggestions.truncated) && (
          <section
            aria-label="Kemungkinan cocok"
            className="border-line rounded-card border bg-white p-5"
          >
            <h2 className="text-ink text-lg font-bold">
              Kemungkinan cocok — periksa identitas
            </h2>
            <p className="text-muted mt-2 text-sm">
              Nama atau NIM tersimpan mirip dengan pencarianmu. Buka laporan dan
              konfirmasikan identitas sebelum mengoreksi data. Kandidat ini
              belum dianggap hasil pasti.
            </p>
            <p className="text-muted mt-2 text-xs">
              Menampilkan {result.suggestions.items.length} dari{" "}
              {result.suggestions.totalMatches} kandidat dalam filter yang
              diterapkan.
            </p>
            <ul className="mt-4 grid gap-3">
              {result.suggestions.items.map((item) => (
                <li
                  key={item.id}
                  className="border-line rounded-control border p-4"
                >
                  <p className="font-bold">{item.name}</p>
                  <p className="mt-1 text-sm">
                    NIM tersimpan: <span className="font-mono">{item.nim}</span>
                  </p>
                  {!nimPattern.test(item.nim) && (
                    <p className="text-warning mt-1 text-xs">
                      Format NIM perlu dikonfirmasi: seharusnya 10 angka.
                    </p>
                  )}
                  <p className="text-muted mt-2 text-sm">
                    {item.title} · {statuses[item.status]}
                    {item.archived ? " · Diarsipkan" : ""}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {item.matchedBy === "nim"
                      ? "NIM berbeda satu pengetikan (angka berlebih, kurang, berbeda atau tertukar)."
                      : "Ejaan nama mirip dengan pencarian."}
                  </p>
                  <Link
                    href={"/admin/laporan/" + item.id}
                    className="text-brand mt-3 inline-block font-bold underline"
                  >
                    Periksa laporan
                  </Link>
                </li>
              ))}
            </ul>
            {result.suggestions.truncated && (
              <p role="status" className="text-warning mt-3 text-sm">
                Kandidat awal terlalu banyak; pemeriksaan dibatasi 1.000
                laporan. Tambahkan nama lain atau persempit filter untuk
                memeriksa sisanya.
              </p>
            )}
          </section>
        )}
      <nav
        aria-label="Halaman tabel"
        className="flex items-center justify-between gap-3"
      >
        <button
          className={button}
          disabled={loading || page <= 1}
          onClick={() => setPage((v) => v - 1)}
        >
          Sebelumnya
        </button>
        <span className="text-muted text-sm">
          Hal. {result.page} / {result.totalPages}
        </span>
        <button
          className={button}
          disabled={loading || page >= result.totalPages}
          onClick={() => setPage((v) => v + 1)}
        >
          Berikutnya
        </button>
      </nav>
      <details className="text-muted text-sm leading-6">
        <summary className="cursor-pointer font-bold">
          Alur kerja singkat
        </summary>
        <p className="mt-2">
          1. Cari dan buka laporan → 2. Tinjau isi → 3. Ubah status dan tulis
          pesan untuk pelapor → 4. Simpan. Mahasiswa membaca pesan melalui bukti
          pelacakan, bukan catatan internal. Gunakan arsip untuk menyembunyikan
          laporan dari antrean, dan Excel untuk rekap privat.
        </p>
      </details>
    </div>
  );
}
