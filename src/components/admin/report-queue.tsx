"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type {
  BemAssignee,
  ReportQueueResult,
  ReportStatus,
  ReportUrgency,
} from "@/server/aspirations/case-management";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StateCard } from "@/components/ui/state-card";

type CategoryOption = {
  id: string;
  name: string;
};

type ReportQueueProps = {
  assignees: BemAssignee[];
  categories: CategoryOption[];
  initial: ReportQueueResult;
};

const statusOptions: Array<{ label: string; value: ReportStatus }> = [
  { label: "Laporan diterima", value: "RECEIVED" },
  { label: "Sedang ditinjau", value: "UNDER_REVIEW" },
  { label: "Perlu klarifikasi", value: "NEEDS_CLARIFICATION" },
  { label: "Dalam koordinasi", value: "IN_COORDINATION" },
  { label: "Pembaruan tersedia", value: "UPDATE_AVAILABLE" },
  { label: "Tindakan dilakukan", value: "ACTION_TAKEN" },
  { label: "Selesai", value: "RESOLVED" },
  { label: "Tidak dapat diproses", value: "CANNOT_PROCESS" },
];

const urgencyOptions: Array<{ label: string; value: ReportUrgency }> = [
  { label: "Rendah", value: "LOW" },
  { label: "Normal", value: "NORMAL" },
  { label: "Tinggi", value: "HIGH" },
  { label: "Perlu eskalasi", value: "ESCALATE" },
];

const statusLabels = Object.fromEntries(
  statusOptions.map(({ label, value }) => [value, label]),
) as Record<ReportStatus, string>;

const urgencyLabels = Object.fromEntries(
  urgencyOptions.map(({ label, value }) => [value, label]),
) as Record<ReportUrgency, string>;

const fieldClassName =
  "rounded-control border-line bg-surface text-ink focus:border-brand w-full border px-3 py-3 text-sm outline-none";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function statusClass(status: ReportStatus) {
  if (status === "CANNOT_PROCESS") {
    return "bg-danger-soft text-danger";
  }

  if (status === "RESOLVED" || status === "ACTION_TAKEN") {
    return "bg-success-soft text-success";
  }

  if (status === "RECEIVED") {
    return "bg-warning-soft text-warning";
  }

  return "bg-brand-soft text-brand";
}

export function ReportQueue({
  assignees,
  categories,
  initial,
}: ReportQueueProps) {
  const [result, setResult] = useState(initial);
  const [status, setStatus] = useState("");
  const [urgency, setUrgency] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assignment, setAssignment] = useState("ALL");
  const [archived, setArchived] = useState("ACTIVE");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({
      archived,
      assignment,
      page: String(page),
      pageSize: String(initial.pageSize),
    });

    if (status) query.set("status", status);
    if (urgency) query.set("urgency", urgency);
    if (categoryId) query.set("categoryId", categoryId);
    if (assigneeUserId) query.set("assigneeUserId", assigneeUserId);
    if (fromDate) query.set("fromDate", fromDate);
    if (search) query.set("search", search);
    if (toDate) query.set("toDate", toDate);

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    async function loadQueue() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/admin/reports?${query.toString()}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as {
          error?: { message?: string };
          reports?: ReportQueueResult;
        };

        if (!response.ok || !body.reports) {
          throw new Error(
            body.error?.message ?? "Antrean laporan belum dapat dimuat.",
          );
        }

        if (!cancelled) {
          setResult(body.reports);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Antrean laporan belum dapat dimuat.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [
    archived,
    assigneeUserId,
    assignment,
    fromDate,
    categoryId,
    initial.pageSize,
    page,
    search,
    status,
    toDate,
    urgency,
  ]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setStatus("");
    setUrgency("");
    setCategoryId("");
    setAssigneeUserId("");
    setAssignment("ALL");
    setArchived("ACTIVE");
    setFromDate("");
    setToDate("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  const empty = !isLoading && !errorMessage && result.items.length === 0;

  return (
    <div className="grid gap-6">
      <header className="max-w-3xl">
        <Badge>Case management</Badge>
        <h1 className="font-display text-ink mt-4 text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">
          Antrean laporan yang perlu dikawal.
        </h1>
        <p className="text-muted mt-4 text-base leading-7">
          Tinjau konteks, tetapkan PIC, ubah status sesuai alur, dan pisahkan
          pesan untuk pelapor dari catatan internal.
        </p>
      </header>

      <Card>
        <form
          aria-label="Filter antrean laporan"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          onSubmit={submitFilters}
        >
          <label className="text-ink grid gap-2 text-sm font-bold md:col-span-2 lg:col-span-3">
            Cari judul, lokasi, atau kode pelacakan
            <input
              className={fieldClassName}
              maxLength={80}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Contoh: laboratorium atau MA-…"
              value={searchInput}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Status
            <select
              className={fieldClassName}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              value={status}
            >
              <option value="">Semua status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Urgensi
            <select
              className={fieldClassName}
              onChange={(event) => {
                setUrgency(event.target.value);
                setPage(1);
              }}
              value={urgency}
            >
              <option value="">Semua urgensi</option>
              {urgencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Kategori
            <select
              className={fieldClassName}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(1);
              }}
              value={categoryId}
            >
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Assignment
            <select
              className={fieldClassName}
              onChange={(event) => {
                setAssignment(event.target.value);
                setPage(1);
              }}
              value={assignment}
            >
              <option value="ALL">Semua assignment</option>
              <option value="ASSIGNED">Sudah ada PIC</option>
              <option value="UNASSIGNED">Belum ada PIC</option>
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Arsip
            <select
              className={fieldClassName}
              onChange={(event) => {
                setArchived(event.target.value);
                setPage(1);
              }}
              value={archived}
            >
              <option value="ACTIVE">Aktif saja</option>
              <option value="ARCHIVED">Arsip saja</option>
              <option value="ALL">Semua laporan</option>
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            PIC spesifik
            <select
              className={fieldClassName}
              onChange={(event) => {
                setAssigneeUserId(event.target.value);
                setPage(1);
              }}
              value={assigneeUserId}
            >
              <option value="">Semua PIC</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.name} · {assignee.role}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Diterima dari
            <input
              className={fieldClassName}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
              type="date"
              value={fromDate}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Diterima sampai
            <input
              className={fieldClassName}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
              type="date"
              value={toDate}
            />
          </label>
          <div className="flex items-end gap-3">
            <button
              className="bg-brand hover:bg-brand-dark min-h-11 flex-1 rounded-full px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? "Memuat…" : "Terapkan filter"}
            </button>
            <button
              className="border-line text-ink hover:border-brand min-h-11 rounded-full border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={resetFilters}
              type="button"
            >
              Reset
            </button>
          </div>
        </form>
      </Card>

      <div
        aria-live="polite"
        className="text-muted flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <p>
          {isLoading
            ? "Memuat antrean…"
            : `${result.totalItems} laporan ditemukan`}
        </p>
        <p>
          Halaman {result.page} dari {result.totalPages}
        </p>
      </div>

      {errorMessage ? (
        <StateCard
          description={errorMessage}
          title="Antrean belum tersedia"
          tone="error"
        />
      ) : null}

      {empty ? (
        <StateCard
          description="Coba ubah filter atau tunggu laporan baru masuk. Data kosong bukan berarti sistem gagal."
          title="Belum ada laporan pada filter ini"
        />
      ) : null}

      {!errorMessage && !empty ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="text-ink w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <caption className="sr-only">Daftar laporan aspirasi</caption>
              <thead>
                <tr className="text-muted text-xs tracking-[0.12em] uppercase">
                  <th className="border-line border-b px-4 py-3 font-bold">
                    Laporan
                  </th>
                  <th className="border-line border-b px-4 py-3 font-bold">
                    Status
                  </th>
                  <th className="border-line border-b px-4 py-3 font-bold">
                    Urgensi
                  </th>
                  <th className="border-line border-b px-4 py-3 font-bold">
                    PIC / rute
                  </th>
                  <th className="border-line border-b px-4 py-3 font-bold">
                    Diterima
                  </th>
                  <th className="border-line border-b px-4 py-3 font-bold">
                    <span className="sr-only">Buka</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id}>
                    <td className="border-line border-b px-4 py-4 align-top">
                      <p className="font-bold">{item.title}</p>
                      <p className="text-muted mt-1 text-xs">
                        {item.category.name} · {item.location}
                      </p>
                    </td>
                    <td className="border-line border-b px-4 py-4 align-top">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(item.status)}`}
                      >
                        {statusLabels[item.status]}
                      </span>
                    </td>
                    <td className="border-line border-b px-4 py-4 align-top text-xs font-bold">
                      {urgencyLabels[item.urgency]}
                    </td>
                    <td className="border-line border-b px-4 py-4 align-top text-xs">
                      {item.assignment ? (
                        <>
                          <p className="font-bold">
                            {item.assignment.assigneeName ??
                              "PIC tidak diketahui"}
                          </p>
                          <p className="text-muted mt-1">
                            {item.assignment.routeLabel}
                          </p>
                        </>
                      ) : (
                        <span className="text-muted">Belum ditetapkan</span>
                      )}
                    </td>
                    <td className="border-line border-b px-4 py-4 align-top text-xs">
                      {formatDate(item.submittedAt)}
                    </td>
                    <td className="border-line border-b px-4 py-4 text-right align-top">
                      <Link
                        className="text-brand hover:text-brand-dark font-bold underline underline-offset-4"
                        href={`/admin/laporan/${item.id}`}
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {result.items.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-ink font-bold">{item.title}</p>
                    <p className="text-muted mt-1 text-xs">
                      {item.category.name} · {item.location}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(item.status)}`}
                  >
                    {statusLabels[item.status]}
                  </span>
                </div>
                <dl className="text-muted mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="font-bold uppercase">Urgensi</dt>
                    <dd className="text-ink mt-1">
                      {urgencyLabels[item.urgency]}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase">PIC</dt>
                    <dd className="text-ink mt-1">
                      {item.assignment?.assigneeName ?? "Belum ditetapkan"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-bold uppercase">Diterima</dt>
                    <dd className="text-ink mt-1">
                      {formatDate(item.submittedAt)}
                    </dd>
                  </div>
                </dl>
                <Link
                  className="border-line text-brand hover:border-brand mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border px-4 py-2 text-sm font-bold"
                  href={`/admin/laporan/${item.id}`}
                >
                  Buka detail laporan
                </Link>
              </Card>
            ))}
          </div>
        </>
      ) : null}

      <nav
        aria-label="Pagination antrean laporan"
        className="flex justify-between gap-3"
      >
        <button
          className="border-line text-ink hover:border-brand min-h-11 rounded-full border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page <= 1 || isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          type="button"
        >
          Sebelumnya
        </button>
        <button
          className="border-line text-ink hover:border-brand min-h-11 rounded-full border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= result.totalPages || isLoading}
          onClick={() => setPage((current) => current + 1)}
          type="button"
        >
          Berikutnya
        </button>
      </nav>
    </div>
  );
}
