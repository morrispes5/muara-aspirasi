"use client";

import { useState } from "react";

import { InputField, TextareaField } from "@/components/ui/field";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type {
  AdminContentItem,
  AdminContentResult,
  ContentKind,
} from "@/server/content/publication";

type CategoryOption = { id: string; label: string; value: string };

type ContentManagerProps = {
  categories: CategoryOption[];
  canApprove: boolean;
  initial: AdminContentResult;
  kind: ContentKind;
};

type FormState = {
  body: string;
  category: string;
  categoryId: string;
  expectedUpdatedAt: string;
  id: string | null;
  isPinned: boolean;
  progressLabel: string;
  reportIds: string;
  slug: string;
  sourceCredit: string;
  sourceUrl: string;
  summary: string;
  title: string;
};

const emptyForm: FormState = {
  body: "",
  category: "",
  categoryId: "",
  expectedUpdatedAt: "",
  id: null,
  isPinned: false,
  progressLabel: "",
  reportIds: "",
  slug: "",
  sourceCredit: "",
  sourceUrl: "",
  summary: "",
  title: "",
};

const statusLabels: Record<string, string> = {
  ARCHIVED: "Diarsipkan",
  DRAFT: "Draf",
  IN_REVIEW: "Menunggu review",
  PUBLISHED: "Terbit",
  SCHEDULED: "Terjadwal",
};

function formFromItem(item: AdminContentItem): FormState {
  return {
    body: item.body,
    category: item.categoryValue ?? "",
    categoryId: item.categoryId ?? "",
    expectedUpdatedAt: item.updatedAt,
    id: item.id,
    isPinned: item.isPinned ?? false,
    progressLabel: item.progressLabel ?? "",
    reportIds: "",
    slug: item.slug,
    sourceCredit: item.sourceCredit ?? "",
    sourceUrl: item.sourceUrl ?? "",
    summary: item.excerpt,
    title: item.title,
  };
}

function statusTone(
  status: string,
): "brand" | "neutral" | "success" | "warning" {
  if (status === "PUBLISHED") return "success";
  if (status === "IN_REVIEW") return "warning";
  if (status === "ARCHIVED") return "neutral";
  return "brand";
}

export function ContentManager({
  categories,
  canApprove,
  initial,
  kind,
}: ContentManagerProps) {
  const [items, setItems] = useState(initial.items);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [page, setPage] = useState(initial.page);
  const [totalItems, setTotalItems] = useState(initial.totalItems);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"error" | "success">(
    "success",
  );

  const visibleItems = items;

  async function loadList(
    nextPage = page,
    nextStatus = status,
    nextSearch = search,
  ) {
    setBusy(true);
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: "50",
    });
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    try {
      const response = await fetch(`/api/admin/content/${kind}?${params}`);
      const result = (await response.json()) as {
        content?: AdminContentResult;
        error?: { message?: string };
      };
      if (!response.ok || !result.content) {
        setFeedbackTone("error");
        setFeedback(
          result.error?.message ?? "Daftar konten belum dapat dimuat.",
        );
        return;
      }
      setItems(result.content.items);
      setPage(result.content.page);
      setTotalItems(result.content.totalItems);
      setTotalPages(result.content.totalPages);
    } catch {
      setFeedbackTone("error");
      setFeedback("Koneksi gagal. Daftar konten belum dapat dimuat.");
    } finally {
      setBusy(false);
    }
  }

  function setField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectItem(item: AdminContentItem) {
    setForm(formFromItem(item));
    setFeedback("");
    setFeedbackTone("success");
  }

  function newItem() {
    setForm({
      ...emptyForm,
      category: kind === "student-info" ? (categories[0]?.value ?? "") : "",
      categoryId: kind === "advocacy" ? (categories[0]?.id ?? "") : "",
    });
    setFeedback("");
    setFeedbackTone("success");
  }

  async function submit(
    action: "archive" | "publish" | "save_draft" | "submit_review",
  ) {
    setBusy(true);
    setFeedback("");
    setFeedbackTone("success");
    const endpoint = form.id
      ? `/api/admin/content/${kind}/${form.id}`
      : `/api/admin/content/${kind}`;
    const requestBody = {
      action,
      body: form.body,
      category: form.category,
      categoryId: form.categoryId,
      expectedUpdatedAt: form.expectedUpdatedAt,
      isPinned: form.isPinned,
      progressLabel: form.progressLabel,
      reportIds:
        kind === "advocacy" && form.reportIds.trim()
          ? form.reportIds.split(/[\s,]+/).filter(Boolean)
          : undefined,
      slug: form.slug,
      sourceCredit: form.sourceCredit,
      sourceUrl: form.sourceUrl,
      summary: form.summary,
      title: form.title,
    };

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
        method: form.id ? "PATCH" : "POST",
      });
      const result = (await response.json()) as {
        content?: AdminContentItem;
        error?: { message?: string };
      };
      if (!response.ok || !result.content) {
        setFeedbackTone("error");
        setFeedback(result.error?.message ?? "Konten belum dapat disimpan.");
        return;
      }
      setItems((current) => {
        const nextContent = result.content;
        if (!nextContent) return current;
        const exists = current.some((item) => item.id === nextContent.id);
        return exists
          ? current.map((item) =>
              item.id === nextContent.id ? nextContent : item,
            )
          : [nextContent, ...current];
      });
      setForm(formFromItem(result.content));
      setTotalItems((current) => (form.id ? current : current + 1));
      setFeedback(
        action === "publish"
          ? "Konten berhasil dipublikasikan."
          : action === "archive"
            ? "Konten berhasil diarsipkan."
            : action === "submit_review"
              ? "Konten dikirim untuk review Admin."
              : "Draf berhasil disimpan.",
      );
      void loadList(page, status, search);
    } catch {
      setFeedbackTone("error");
      setFeedback("Koneksi gagal. Coba lagi beberapa saat.");
    } finally {
      setBusy(false);
    }
  }

  const selected = form.id
    ? items.find((item) => item.id === form.id)
    : undefined;
  const isArchived = selected?.publicationStatus === "ARCHIVED";
  const isPublished = selected?.publicationStatus === "PUBLISHED";
  const canSave = !busy && !isArchived && (!isPublished || canApprove);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Card className="h-fit">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
              Daftar konten
            </p>
            <h2 className="text-ink mt-2 text-2xl font-bold">
              {totalItems} entri
            </h2>
          </div>
          <button
            className="bg-brand rounded-control hover:bg-brand-dark min-h-11 px-4 text-sm font-bold text-white"
            onClick={newItem}
            type="button"
          >
            Buat draf
          </button>
        </div>
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void loadList(1, status, search);
          }}
        >
          <label className="text-ink grid gap-2 text-sm font-bold">
            Cari judul atau slug
            <input
              className="rounded-control border-line bg-surface min-h-11 border px-3 text-sm font-normal"
              maxLength={100}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ketik kata kunci"
              type="search"
              value={search}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Filter status
            <select
              className="rounded-control border-line bg-surface min-h-11 border px-3 text-sm font-normal"
              onChange={(event) => {
                const nextStatus = event.target.value;
                setStatus(nextStatus);
                void loadList(1, nextStatus, search);
              }}
              value={status}
            >
              <option value="ALL">Semua status</option>
              <option value="DRAFT">Draf</option>
              <option value="IN_REVIEW">Menunggu review</option>
              {kind === "student-info" ? (
                <option value="SCHEDULED">Terjadwal</option>
              ) : null}
              <option value="PUBLISHED">Terbit</option>
              <option value="ARCHIVED">Diarsipkan</option>
            </select>
          </label>
          <button
            className="text-ink rounded-control border-line hover:border-brand min-h-11 border px-4 text-sm font-bold disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            Cari konten
          </button>
        </form>
        <div className="mt-6 grid gap-3">
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <button
                className={`rounded-control border p-4 text-left transition-colors ${
                  item.id === form.id
                    ? "border-brand bg-brand-soft"
                    : "border-line hover:border-brand"
                }`}
                key={item.id}
                onClick={() => selectItem(item)}
                type="button"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink font-bold">{item.title}</span>
                  <Badge tone={statusTone(item.publicationStatus)}>
                    {statusLabels[item.publicationStatus] ??
                      item.publicationStatus}
                  </Badge>
                </span>
                <span className="text-muted mt-2 block text-xs">
                  /{item.slug} · diperbarui{" "}
                  {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                </span>
              </button>
            ))
          ) : (
            <p className="text-muted rounded-control border-line border border-dashed p-4 text-sm">
              Belum ada konten pada filter ini.
            </p>
          )}
        </div>
        {totalPages > 1 ? (
          <div className="border-line mt-5 flex items-center justify-between gap-3 border-t pt-4">
            <button
              className="text-brand rounded-control border-line hover:border-brand border px-3 py-2 text-xs font-bold disabled:opacity-40"
              disabled={busy || page <= 1}
              onClick={() => void loadList(page - 1, status, search)}
              type="button"
            >
              Sebelumnya
            </button>
            <span className="text-muted text-xs">
              Halaman {page} dari {totalPages}
            </span>
            <button
              className="text-brand rounded-control border-line hover:border-brand border px-3 py-2 text-xs font-bold disabled:opacity-40"
              disabled={busy || page >= totalPages}
              onClick={() => void loadList(page + 1, status, search)}
              type="button"
            >
              Berikutnya
            </button>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
              Editor konten
            </p>
            <h2 className="text-ink mt-2 text-2xl font-bold">
              {form.id ? "Perbarui konten" : "Draf baru"}
            </h2>
          </div>
          {selected ? (
            <Badge tone={statusTone(selected.publicationStatus)}>
              {statusLabels[selected.publicationStatus] ??
                selected.publicationStatus}
            </Badge>
          ) : null}
        </div>
        {feedback ? (
          <p
            aria-live="polite"
            className={
              feedbackTone === "error"
                ? "text-danger bg-danger-soft rounded-control mt-5 p-3 text-sm font-semibold"
                : "text-brand bg-brand-soft rounded-control mt-5 p-3 text-sm font-semibold"
            }
            role={feedbackTone === "error" ? "alert" : "status"}
          >
            {feedback}
          </p>
        ) : null}
        {isPublished && !canApprove ? (
          <p className="text-muted bg-surface-muted rounded-control mt-5 p-3 text-sm">
            Konten terbit dikunci untuk peran ini. Minta Admin melakukan
            perubahan agar versi baru tetap melewati review.
          </p>
        ) : null}
        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit("save_draft");
          }}
        >
          <InputField
            label="Judul"
            maxLength={200}
            onChange={(event) => setField("title", event.target.value)}
            required
            value={form.title}
          />
          <InputField
            hint="Gunakan huruf kecil, angka, dan tanda hubung."
            label="Slug"
            maxLength={120}
            onChange={(event) => setField("slug", event.target.value)}
            required
            value={form.slug}
          />
          <label className="text-ink grid gap-2 text-sm font-bold">
            Kategori
            <select
              className="rounded-control border-line bg-surface min-h-11 border px-3 text-sm font-normal"
              onChange={(event) =>
                setField(
                  kind === "advocacy" ? "categoryId" : "category",
                  event.target.value,
                )
              }
              required
              value={kind === "advocacy" ? form.categoryId : form.category}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option
                  key={category.value}
                  value={kind === "advocacy" ? category.id : category.value}
                >
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          {kind === "advocacy" ? (
            <InputField
              label="Label progres"
              maxLength={120}
              onChange={(event) =>
                setField("progressLabel", event.target.value)
              }
              required
              value={form.progressLabel}
            />
          ) : null}
          {kind === "student-info" ? (
            <label className="text-ink flex items-center gap-3 text-sm font-bold">
              <input
                checked={form.isPinned}
                className="accent-brand size-4"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isPinned: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              Tampilkan sebagai info tersemat
            </label>
          ) : null}
          {kind === "advocacy" ? (
            <TextareaField
              hint="Opsional. Satu UUID laporan per baris atau dipisahkan koma. Relasi ini privat dan tidak tampil di halaman publik."
              label="ID laporan internal yang ditautkan"
              maxLength={800}
              onChange={(event) => setField("reportIds", event.target.value)}
              value={form.reportIds}
            />
          ) : null}
          <TextareaField
            label="Ringkasan"
            maxLength={1000}
            onChange={(event) => setField("summary", event.target.value)}
            required
            value={form.summary}
          />
          <TextareaField
            hint="Teks biasa; jangan masukkan identitas pelapor atau isi laporan privat."
            label="Isi konten"
            maxLength={12000}
            onChange={(event) => setField("body", event.target.value)}
            required
            value={form.body}
          />
          {kind === "student-info" ? (
            <InputField
              label="URL sumber (opsional)"
              onChange={(event) => setField("sourceUrl", event.target.value)}
              type="url"
              value={form.sourceUrl}
            />
          ) : null}
          <InputField
            label="Kredit sumber (opsional)"
            maxLength={500}
            onChange={(event) => setField("sourceCredit", event.target.value)}
            value={form.sourceCredit}
          />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="bg-brand rounded-control min-h-11 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canSave}
              type="submit"
            >
              {busy ? "Menyimpan…" : "Simpan draf"}
            </button>
            {form.id && selected?.publicationStatus === "DRAFT" ? (
              <button
                className="text-ink rounded-control border-line hover:border-brand min-h-11 border px-4 text-sm font-bold disabled:opacity-50"
                disabled={!canSave}
                onClick={() => void submit("submit_review")}
                type="button"
              >
                Kirim untuk review
              </button>
            ) : null}
            {form.id &&
            selected?.publicationStatus === "IN_REVIEW" &&
            canApprove ? (
              <button
                className="bg-success rounded-control min-h-11 px-4 text-sm font-bold text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => void submit("publish")}
                type="button"
              >
                Publikasikan
              </button>
            ) : null}
            {form.id &&
            selected?.publicationStatus === "PUBLISHED" &&
            canApprove ? (
              <button
                className="text-danger rounded-control border-danger/40 hover:bg-danger-soft min-h-11 border px-4 text-sm font-bold disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Arsipkan konten ini? Konten tidak lagi tampil di halaman publik.",
                    )
                  ) {
                    void submit("archive");
                  }
                }}
                type="button"
              >
                Arsipkan
              </button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
