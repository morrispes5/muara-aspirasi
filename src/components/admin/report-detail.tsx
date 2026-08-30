"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  BemAssignee,
  ReportDetail,
  ReportReasonCode,
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

type ReportDetailProps = {
  canAudit: boolean;
  canManageLifecycle: boolean;
  canProcess: boolean;
  categories: CategoryOption[];
  initial: ReportDetail;
  assignees: BemAssignee[];
};

const statusLabels: Record<ReportStatus, string> = {
  ACTION_TAKEN: "Tindakan dilakukan",
  CANNOT_PROCESS: "Tidak dapat diproses",
  IN_COORDINATION: "Dalam koordinasi",
  NEEDS_CLARIFICATION: "Perlu klarifikasi",
  RECEIVED: "Laporan diterima",
  RESOLVED: "Selesai",
  UNDER_REVIEW: "Sedang ditinjau BEM",
  UPDATE_AVAILABLE: "Pembaruan tersedia",
};

const urgencyLabels: Record<ReportUrgency, string> = {
  ESCALATE: "Perlu eskalasi",
  HIGH: "Tinggi",
  LOW: "Rendah",
  NORMAL: "Normal",
};

const reasonLabels: Record<ReportReasonCode, string> = {
  DUPLICATE_REPORT: "Laporan duplikat",
  INSUFFICIENT_INFORMATION: "Informasi belum cukup",
  OPERATIONAL_CORRECTION: "Koreksi operasional",
  OUT_OF_SCOPE: "Di luar ruang lingkup",
  POLICY_VIOLATION: "Melanggar kebijakan pelaporan",
  SAFETY_ESCALATION: "Perlu eskalasi keselamatan",
};

const nextStatusByStatus: Record<ReportStatus, ReportStatus[]> = {
  ACTION_TAKEN: ["RESOLVED"],
  CANNOT_PROCESS: [],
  IN_COORDINATION: [
    "UPDATE_AVAILABLE",
    "ACTION_TAKEN",
    "RESOLVED",
    "CANNOT_PROCESS",
  ],
  NEEDS_CLARIFICATION: ["UNDER_REVIEW", "IN_COORDINATION", "CANNOT_PROCESS"],
  RECEIVED: ["UNDER_REVIEW", "CANNOT_PROCESS"],
  RESOLVED: [],
  UNDER_REVIEW: ["NEEDS_CLARIFICATION", "IN_COORDINATION", "CANNOT_PROCESS"],
  UPDATE_AVAILABLE: ["IN_COORDINATION", "ACTION_TAKEN", "RESOLVED"],
};

const fieldClassName =
  "rounded-control border-line bg-surface text-ink focus:border-brand w-full border px-3 py-3 text-sm outline-none";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status: ReportStatus) {
  if (status === "CANNOT_PROCESS") return "bg-danger-soft text-danger";
  if (status === "RESOLVED" || status === "ACTION_TAKEN") {
    return "bg-success-soft text-success";
  }
  if (status === "RECEIVED") return "bg-warning-soft text-warning";
  return "bg-brand-soft text-brand";
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    REPORT_ARCHIVED: "Laporan diarsipkan",
    REPORT_ASSIGNMENT_CHANGED: "Assignment diubah",
    REPORT_CASE_FIELDS_UPDATED: "Detail kasus diubah",
    REPORT_DETAIL_VIEWED: "Detail dibuka",
    REPORT_INTERNAL_NOTE_ADDED: "Catatan internal ditambahkan",
    REPORT_INTERNAL_NOTE_DELETED: "Catatan internal dihapus",
    REPORT_REOPENED: "Laporan dibuka kembali",
    REPORT_REPORTER_MESSAGE_ADDED: "Pesan pelapor ditambahkan",
    REPORT_STATUS_CHANGED: "Status diubah",
  };

  return labels[action] ?? action;
}

export function ReportDetailView({
  canAudit,
  canManageLifecycle,
  canProcess,
  categories,
  initial,
  assignees,
}: ReportDetailProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<ReportStatus>(
    nextStatusByStatus[initial.report.status][0] ?? initial.report.status,
  );
  const [statusReason, setStatusReason] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [categoryId, setCategoryId] = useState(initial.report.category.id);
  const [urgency, setUrgency] = useState<ReportUrgency>(initial.report.urgency);
  const [internalSummary, setInternalSummary] = useState(
    initial.report.internalSummary ?? "",
  );
  const activeAssignment = initial.assignments.find((item) => !item.endedAt);
  const [assigneeId, setAssigneeId] = useState(
    activeAssignment?.assigneeId ?? assignees[0]?.id ?? "",
  );
  const [routeLabel, setRouteLabel] = useState(
    activeAssignment?.routeLabel ?? "",
  );
  const [assignmentReason, setAssignmentReason] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [reporterMessage, setReporterMessage] = useState("");
  const [lifecycleReason, setLifecycleReason] = useState<ReportReasonCode | "">(
    "",
  );
  const canMutate = canProcess && !initial.report.archivedAt;

  async function mutate(action: string, fields: Record<string, unknown>) {
    setIsSaving(true);
    setFeedback(null);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/admin/reports/${initial.report.id}`, {
        body: JSON.stringify({
          action,
          expectedUpdatedAt: initial.report.updatedAt,
          ...fields,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          body.error?.message ?? "Perubahan belum dapat disimpan.",
        );
      }

      setFeedback("Perubahan tersimpan.");
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Perubahan belum dapat disimpan.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("status", {
      reasonCode: statusReason || null,
      reporterMessage: statusMessage || null,
      toStatus: statusTarget,
    });
  }

  function submitCaseFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("case-fields", {
      categoryId,
      internalSummary: internalSummary || null,
      urgency,
    });
  }

  function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("assign", {
      assigneeUserId: assigneeId,
      reason: assignmentReason || null,
      routeLabel,
    });
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("internal-note", { body: noteBody });
    setNoteBody("");
  }

  function submitReporterMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("reporter-message", { message: reporterMessage });
    setReporterMessage("");
  }

  function archive() {
    if (!lifecycleReason) {
      setErrorMessage("Pilih alasan sebelum mengarsipkan laporan.");
      return;
    }

    if (
      !window.confirm(
        "Arsipkan laporan ini? Laporan tidak akan muncul di antrean aktif.",
      )
    ) {
      return;
    }

    void mutate("archive", { reasonCode: lifecycleReason });
  }

  function reopen() {
    if (!lifecycleReason) {
      setErrorMessage("Pilih alasan sebelum membuka kembali laporan.");
      return;
    }

    if (
      !window.confirm(
        "Buka kembali laporan ini dan kembalikan ke tahap tinjauan?",
      )
    ) {
      return;
    }

    void mutate("reopen", {
      reasonCode: lifecycleReason,
      reporterMessage: statusMessage || null,
    });
  }

  function deleteNote(noteId: string) {
    const deletionReason = window.prompt(
      "Tulis alasan penghapusan catatan internal:",
    );
    if (!deletionReason?.trim()) return;

    if (!window.confirm("Hapus catatan internal ini secara soft-delete?")) {
      return;
    }

    void mutate("delete-note", {
      deletionReason,
      noteId,
    });
  }

  const nextStatuses = nextStatusByStatus[initial.report.status];

  return (
    <div className="grid gap-6">
      <header>
        <Link
          className="text-brand hover:text-brand-dark text-sm font-bold underline underline-offset-4"
          href="/admin/laporan"
        >
          ← Kembali ke antrean
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Badge>Detail laporan</Badge>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(initial.report.status)}`}
          >
            {statusLabels[initial.report.status]}
          </span>
          {initial.report.archivedAt ? (
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
              Diarsipkan
            </span>
          ) : null}
        </div>
        <h1 className="font-display text-ink mt-4 max-w-4xl text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">
          {initial.report.title}
        </h1>
        <p className="text-muted mt-4 text-sm leading-6">
          {initial.report.category.name} · {initial.report.location} · diterima{" "}
          {formatDate(initial.report.submittedAt)} · kode{" "}
          {initial.report.trackingCode}
        </p>
      </header>

      {feedback ? (
        <p
          aria-live="polite"
          className="border-success/25 bg-success-soft text-success rounded-control border p-3 text-sm"
        >
          {feedback}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          aria-live="assertive"
          className="border-danger bg-danger-soft text-danger rounded-control border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
        <div className="grid min-w-0 gap-6">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                  Konteks mahasiswa
                </p>
                <h2 className="text-ink mt-2 text-2xl font-bold">
                  Isi laporan
                </h2>
              </div>
              <span className="bg-warning-soft text-warning rounded-full px-3 py-1 text-xs font-bold">
                Urgensi: {urgencyLabels[initial.report.urgency]}
              </span>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
                  Judul
                </dt>
                <dd className="text-ink mt-2 text-base leading-7">
                  {initial.report.title}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
                  Kategori
                </dt>
                <dd className="text-ink mt-2 text-sm">
                  {initial.report.category.name}
                </dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
                  Lokasi
                </dt>
                <dd className="text-ink mt-2 text-sm">
                  {initial.report.location}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
                  Kronologi
                </dt>
                <dd className="text-ink mt-2 text-sm leading-7 whitespace-pre-wrap">
                  {initial.report.chronology}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
                  Dampak
                </dt>
                <dd className="text-ink mt-2 text-sm leading-7 whitespace-pre-wrap">
                  {initial.report.impact}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted text-xs font-bold tracking-[0.12em] uppercase">
                  Usulan solusi
                </dt>
                <dd className="text-ink mt-2 text-sm leading-7 whitespace-pre-wrap">
                  {initial.report.suggestedSolution ??
                    "Tidak ada usulan tambahan."}
                </dd>
              </div>
            </dl>
          </Card>

          {initial.identity ? (
            <Card className="border-warning/35">
              <p className="text-warning text-xs font-bold tracking-[0.14em] uppercase">
                Restricted identity
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Identitas pelapor
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Data ini hanya untuk BEM berwenang dan tidak boleh disalin ke
                pesan pelapor, update publik, atau catatan yang tidak perlu.
              </p>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-muted text-xs font-bold uppercase">
                    Nama
                  </dt>
                  <dd className="text-ink mt-1 text-sm">
                    {initial.identity.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs font-bold uppercase">
                    NIM
                  </dt>
                  <dd className="text-ink mt-1 font-mono text-sm">
                    {initial.identity.nim}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs font-bold uppercase">
                    Email
                  </dt>
                  <dd className="text-ink mt-1 text-sm">
                    {initial.identity.email ?? "Tidak diberikan"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs font-bold uppercase">
                    WhatsApp
                  </dt>
                  <dd className="text-ink mt-1 text-sm">
                    {initial.identity.whatsapp ?? "Tidak diberikan"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs font-bold uppercase">
                    Izin kontak
                  </dt>
                  <dd className="text-ink mt-1 text-sm">
                    {initial.identity.contactAllowed
                      ? "Diizinkan"
                      : "Tidak diizinkan"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-xs font-bold uppercase">
                    Ruang berbagi
                  </dt>
                  <dd className="text-ink mt-1 text-sm">
                    {initial.identity.identityShareScope ===
                    "LIMITED_DESTINATION_UNIT"
                      ? "Unit tujuan terbatas"
                      : "BEM saja"}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : (
            <StateCard
              description="Projection identitas tidak dikirim untuk peran yang tidak memiliki izin confidential report."
              title="Identitas dibatasi"
            />
          )}

          {canProcess ? (
            <Card>
              <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                Klasifikasi internal
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Kategori, urgensi, dan ringkasan
              </h2>
              <form className="mt-6 grid gap-5" onSubmit={submitCaseFields}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-ink grid gap-2 text-sm font-bold">
                    Kategori
                    <select
                      className={fieldClassName}
                      disabled={!canMutate || isSaving}
                      onChange={(event) => setCategoryId(event.target.value)}
                      value={categoryId}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-ink grid gap-2 text-sm font-bold">
                    Urgensi
                    <select
                      className={fieldClassName}
                      disabled={!canMutate || isSaving}
                      onChange={(event) =>
                        setUrgency(event.target.value as ReportUrgency)
                      }
                      value={urgency}
                    >
                      {Object.entries(urgencyLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="text-ink grid gap-2 text-sm font-bold">
                  Ringkasan internal
                  <textarea
                    className={`${fieldClassName} min-h-28 resize-y`}
                    disabled={!canMutate || isSaving}
                    maxLength={3000}
                    onChange={(event) => setInternalSummary(event.target.value)}
                    value={internalSummary}
                  />
                  <span className="text-muted text-xs font-normal">
                    Ringkasan ini hanya untuk workflow BEM, bukan pesan pelapor.
                  </span>
                </label>
                <button
                  className="bg-brand hover:bg-brand-dark min-h-11 w-fit rounded-full px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canMutate || isSaving}
                  type="submit"
                >
                  Simpan klasifikasi
                </button>
              </form>
            </Card>
          ) : null}

          {canProcess ? (
            <Card>
              <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                Workflow
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Ubah status dengan konteks
              </h2>
              <form className="mt-6 grid gap-5" onSubmit={submitStatus}>
                {nextStatuses.length ? (
                  <label className="text-ink grid gap-2 text-sm font-bold">
                    Status berikutnya
                    <select
                      className={fieldClassName}
                      disabled={!canMutate || isSaving}
                      onChange={(event) =>
                        setStatusTarget(event.target.value as ReportStatus)
                      }
                      value={statusTarget}
                    >
                      {nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="text-muted rounded-control bg-brand-soft p-3 text-sm leading-6">
                    Belum ada transisi status lanjutan. Tambahkan pesan pelapor
                    bila ada informasi baru.
                  </p>
                )}
                {statusTarget === "CANNOT_PROCESS" ? (
                  <label className="text-ink grid gap-2 text-sm font-bold">
                    Alasan wajib
                    <select
                      className={fieldClassName}
                      disabled={!canMutate || isSaving}
                      onChange={(event) => setStatusReason(event.target.value)}
                      required
                      value={statusReason}
                    >
                      <option value="">Pilih alasan</option>
                      {Object.entries(reasonLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="text-ink grid gap-2 text-sm font-bold">
                  Pesan untuk pelapor{" "}
                  <span className="text-muted font-normal">
                    (wajib untuk klarifikasi, opsional lainnya)
                  </span>
                  <textarea
                    className={`${fieldClassName} min-h-28 resize-y`}
                    disabled={!canMutate || isSaving}
                    maxLength={3000}
                    onChange={(event) => setStatusMessage(event.target.value)}
                    value={statusMessage}
                  />
                </label>
                <button
                  className="bg-brand hover:bg-brand-dark min-h-11 w-fit rounded-full px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canMutate || isSaving || !nextStatuses.length}
                  type="submit"
                >
                  Simpan perubahan status
                </button>
              </form>
            </Card>
          ) : null}

          {canProcess ? (
            <Card>
              <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                Reporter-visible
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Tambah pesan tanpa mengubah status
              </h2>
              <form
                className="mt-6 grid gap-5"
                onSubmit={submitReporterMessage}
              >
                <label className="text-ink grid gap-2 text-sm font-bold">
                  Pesan progres aman
                  <textarea
                    className={`${fieldClassName} min-h-28 resize-y`}
                    disabled={!canMutate || isSaving}
                    maxLength={3000}
                    onChange={(event) => setReporterMessage(event.target.value)}
                    value={reporterMessage}
                  />
                </label>
                <button
                  className="border-line text-brand hover:border-brand min-h-11 w-fit rounded-full border px-5 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canMutate || isSaving || !reporterMessage.trim()}
                  type="submit"
                >
                  Tambahkan pesan pelapor
                </button>
              </form>
            </Card>
          ) : null}

          {canProcess ? (
            <Card>
              <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                Catatan internal
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Ruang koordinasi BEM
              </h2>
              <form className="mt-6 grid gap-5" onSubmit={submitNote}>
                <label className="text-ink grid gap-2 text-sm font-bold">
                  Catatan baru
                  <textarea
                    className={`${fieldClassName} min-h-32 resize-y`}
                    disabled={!canMutate || isSaving}
                    maxLength={5000}
                    onChange={(event) => setNoteBody(event.target.value)}
                    value={noteBody}
                  />
                </label>
                <button
                  className="bg-ink min-h-11 w-fit rounded-full px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canMutate || isSaving || !noteBody.trim()}
                  type="submit"
                >
                  Simpan catatan internal
                </button>
              </form>
              <div className="border-line mt-6 grid gap-3 border-t pt-5">
                {initial.internalNotes.length ? (
                  initial.internalNotes.map((note) => (
                    <article
                      className="border-line rounded-control border p-4"
                      key={note.id}
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-xs">
                        <p className="text-ink font-bold">{note.authorName}</p>
                        <time className="text-muted" dateTime={note.createdAt}>
                          {formatDate(note.createdAt)}
                        </time>
                      </div>
                      {note.deletedAt ? (
                        <p className="text-muted mt-3 text-sm italic">
                          Catatan dihapus:{" "}
                          {note.deletionReason ?? "alasan tidak tersedia"}.
                        </p>
                      ) : (
                        <p className="text-ink mt-3 text-sm leading-6 whitespace-pre-wrap">
                          {note.body}
                        </p>
                      )}
                      {!note.deletedAt ? (
                        <button
                          className="text-danger mt-4 text-xs font-bold underline underline-offset-4 disabled:opacity-50"
                          disabled={isSaving}
                          onClick={() => deleteNote(note.id)}
                          type="button"
                        >
                          Hapus catatan
                        </button>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="text-muted text-sm">
                    Belum ada catatan internal.
                  </p>
                )}
              </div>
            </Card>
          ) : null}

          <Card>
            <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
              Jejak status
            </p>
            <h2 className="text-ink mt-2 text-2xl font-bold">
              Riwayat laporan
            </h2>
            <ol className="border-line mt-6 grid gap-5 border-l pl-5">
              {initial.statusEvents.map((event, index) => (
                <li className="relative" key={`${event.createdAt}-${index}`}>
                  <span
                    aria-hidden="true"
                    className="bg-brand absolute top-1 -left-[1.55rem] size-3 rounded-full"
                  />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-ink text-sm font-bold">
                      {event.toStatus
                        ? statusLabels[event.toStatus]
                        : "Pembaruan"}
                    </p>
                    <time
                      className="text-muted text-xs"
                      dateTime={event.createdAt}
                    >
                      {formatDate(event.createdAt)}
                    </time>
                  </div>
                  <p className="text-muted mt-1 text-xs">
                    {event.actorName ?? "Sistem penerimaan"}
                    {event.isReporterVisible
                      ? " · terlihat pelapor"
                      : " · internal"}
                  </p>
                  {event.reporterMessage ? (
                    <p className="text-ink mt-2 text-sm leading-6 whitespace-pre-wrap">
                      {event.reporterMessage}
                    </p>
                  ) : null}
                  {event.reasonCode ? (
                    <p className="text-muted mt-2 text-xs">
                      Alasan:{" "}
                      {reasonLabels[event.reasonCode as ReportReasonCode] ??
                        event.reasonCode}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="grid h-fit gap-6 xl:sticky xl:top-28">
          {canProcess ? (
            <Card>
              <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                Assignment
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">PIC dan rute</h2>
              <form className="mt-6 grid gap-5" onSubmit={submitAssignment}>
                <label className="text-ink grid gap-2 text-sm font-bold">
                  PIC aktif
                  <select
                    className={fieldClassName}
                    disabled={!canMutate || isSaving || !assignees.length}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    required
                    value={assigneeId}
                  >
                    <option value="">Pilih PIC</option>
                    {assignees.map((assignee) => (
                      <option key={assignee.id} value={assignee.id}>
                        {assignee.name} · {assignee.role}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-ink grid gap-2 text-sm font-bold">
                  Rute koordinasi
                  <input
                    className={fieldClassName}
                    disabled={!canMutate || isSaving}
                    maxLength={160}
                    onChange={(event) => setRouteLabel(event.target.value)}
                    placeholder="Contoh: Pengelola laboratorium"
                    required
                    value={routeLabel}
                  />
                </label>
                <label className="text-ink grid gap-2 text-sm font-bold">
                  Konteks assignment{" "}
                  <span className="text-muted font-normal">(opsional)</span>
                  <textarea
                    className={`${fieldClassName} min-h-24 resize-y`}
                    disabled={!canMutate || isSaving}
                    maxLength={1000}
                    onChange={(event) =>
                      setAssignmentReason(event.target.value)
                    }
                    value={assignmentReason}
                  />
                </label>
                <button
                  className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canMutate || isSaving || !assignees.length}
                  type="submit"
                >
                  Simpan assignment
                </button>
              </form>
              <div className="border-line mt-6 grid gap-3 border-t pt-5">
                <h3 className="text-ink text-sm font-bold">
                  Riwayat assignment
                </h3>
                {initial.assignments.length ? (
                  initial.assignments.map((assignment) => (
                    <div
                      className="border-line border-b pb-3 text-xs last:border-0 last:pb-0"
                      key={assignment.id}
                    >
                      <p className="text-ink font-bold">
                        {assignment.assigneeName ?? "PIC tidak diketahui"}
                      </p>
                      <p className="text-muted mt-1">
                        {assignment.routeLabel} · oleh{" "}
                        {assignment.assignedByName}
                      </p>
                      <p className="text-muted mt-1">
                        {formatDate(assignment.assignedAt)}
                        {assignment.endedAt
                          ? ` – ${formatDate(assignment.endedAt)}`
                          : " · aktif"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-xs">Belum ada assignment.</p>
                )}
              </div>
            </Card>
          ) : null}

          {initial.evidence.length ? (
            <Card>
              <p className="text-warning text-xs font-bold tracking-[0.14em] uppercase">
                Restricted evidence
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Metadata evidence
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                File belum memiliki jalur download pada M6. Tidak ada object URL
                yang dikirim ke browser.
              </p>
              <div className="mt-5 grid gap-3">
                {initial.evidence.map((item) => (
                  <div
                    className="border-line rounded-control border p-3 text-xs"
                    key={item.id}
                  >
                    <p className="text-ink font-bold">
                      {item.originalFilename}
                    </p>
                    <p className="text-muted mt-1">
                      {item.mimeType} · {formatBytes(item.sizeBytes)} ·{" "}
                      {item.validationStatus}
                    </p>
                    <p className="text-muted mt-1 font-mono break-all">
                      SHA-256 {item.checksumSha256}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <StateCard
              description="Tidak ada evidence yang tersimpan pada laporan ini. Upload dan R2 tetap berada di milestone berikutnya."
              title="Belum ada evidence"
            />
          )}

          {canManageLifecycle ? (
            <Card className="border-danger/30">
              <p className="text-danger text-xs font-bold tracking-[0.14em] uppercase">
                Lifecycle sensitif
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Arsip dan buka kembali
              </h2>
              <p className="text-muted mt-2 text-sm leading-6">
                Tindakan ini membutuhkan alasan, konfirmasi, dan audit. Laporan
                arsip tidak bisa dimutasi sebelum dibuka kembali.
              </p>
              <label className="text-ink mt-5 grid gap-2 text-sm font-bold">
                Alasan tindakan
                <select
                  className={fieldClassName}
                  disabled={isSaving}
                  onChange={(event) =>
                    setLifecycleReason(
                      event.target.value as ReportReasonCode | "",
                    )
                  }
                  value={lifecycleReason}
                >
                  <option value="">Pilih alasan</option>
                  {Object.entries(reasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {initial.report.archivedAt ? (
                <button
                  className="bg-brand hover:bg-brand-dark mt-4 min-h-11 w-full rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                  disabled={isSaving}
                  onClick={reopen}
                  type="button"
                >
                  Buka kembali laporan
                </button>
              ) : (
                <button
                  className="border-danger text-danger hover:bg-danger-soft mt-4 min-h-11 w-full rounded-full border px-5 py-3 text-sm font-bold disabled:opacity-50"
                  disabled={isSaving}
                  onClick={archive}
                  type="button"
                >
                  Arsipkan laporan
                </button>
              )}
            </Card>
          ) : null}

          {canAudit ? (
            <Card>
              <p className="text-brand text-xs font-bold tracking-[0.14em] uppercase">
                Audit
              </p>
              <h2 className="text-ink mt-2 text-2xl font-bold">
                Jejak tindakan
              </h2>
              <div className="mt-5 grid gap-3">
                {initial.audit.length ? (
                  initial.audit.map((event, index) => (
                    <div
                      className="border-line border-b pb-3 text-xs last:border-0 last:pb-0"
                      key={`${event.occurredAt}-${index}`}
                    >
                      <p className="text-ink font-bold">
                        {auditLabel(event.action)}
                      </p>
                      <p className="text-muted mt-1">
                        {event.actorName ?? "Sistem"} ·{" "}
                        {formatDate(event.occurredAt)}
                      </p>
                      {event.reasonCode ? (
                        <p className="text-muted mt-1">
                          Alasan:{" "}
                          {reasonLabels[event.reasonCode as ReportReasonCode] ??
                            event.reasonCode}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-xs">Belum ada audit report.</p>
                )}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
