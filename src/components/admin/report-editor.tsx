"use client";

import { type FormEvent, useState } from "react";
import {
  reportFieldDefinitions,
  reportFieldError,
  type ReportFields,
} from "@/lib/report-fields";
import Link from "next/link";
import type { TrackingCredential } from "@/lib/tracking-receipt";
import { TrackingReceipt } from "@/components/aspirations/tracking-receipt";
import { useRouter } from "next/navigation";

type Props = {
  categories?: Array<{ id: string; name: string }>;
  initial?: ReportFields;
  reportId?: string;
  expectedUpdatedAt?: string;
};
const fieldClass =
  "border-line rounded-control w-full border bg-white p-3 text-sm";

export function ReportEditor({
  categories = [],
  initial,
  reportId,
  expectedUpdatedAt,
}: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<ReportFields>(
    initial ??
      (Object.fromEntries(
        reportFieldDefinitions.map((f) => [f.key, ""]),
      ) as ReportFields),
  );
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [contactAllowed, setContactAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<
    (TrackingCredential & { reportId?: string }) | null
  >(null);
  const [requestKey, setRequestKey] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    for (const field of reportFieldDefinitions) {
      const error = reportFieldError(field.key, fields[field.key]);
      if (error) {
        setMessage(field.label + ": " + error);
        return;
      }
    }
    setSaving(true);
    setMessage("");
    const key = requestKey || crypto.randomUUID();
    setRequestKey(key);
    try {
      const response = await fetch(
        reportId
          ? "/api/admin/reports/" + reportId
          : "/api/admin/reports/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "idempotency-key": key,
          },
          body: JSON.stringify(
            reportId
              ? { action: "edit-content", fields, reason, expectedUpdatedAt }
              : {
                  ...fields,
                  categoryId,
                  contactAllowed,
                  ethicsAccepted: consent,
                },
          ),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Belum dapat disimpan.");
      if (reportId) {
        setMessage(
          "Koreksi tersimpan. Token, persetujuan privasi dan riwayat status tidak berubah.",
        );
        router.refresh();
      } else setReceipt(body.receipt);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan. Periksa tabel sebelum mengirim ulang.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (receipt)
    return (
      <div className="grid gap-4">
        <p className="text-muted text-sm">
          Laporan dicatat oleh admin. Serahkan bukti hanya kepada mahasiswa yang
          bersangkutan melalui kanal privat yang telah diverifikasi.
        </p>
        <TrackingReceipt receipt={receipt} />
        <Link
          className="text-brand font-bold underline"
          href={"/admin/laporan/" + receipt.reportId}
        >
          Buka laporan yang dibuat
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="grid gap-4">
      <p className="text-muted text-sm leading-6">
        {reportId
          ? "Koreksi hanya berdasarkan informasi yang sudah dikonfirmasi mahasiswa. Jangan mengarang kontak untuk melengkapi data lama."
          : "Catat aspirasi yang disampaikan mahasiswa secara langsung. Semua isian wajib; identitas tetap BEM saja. Jangan membuat laporan tanpa sepengetahuan pelapor."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {reportFieldDefinitions.map((field, index) => (
          <label
            key={field.key}
            className={
              "grid gap-2 text-sm font-bold " +
              (index >= 4 ? "sm:col-span-2" : "")
            }
          >
            {field.label}
            {index >= 6 ? (
              <textarea
                className={fieldClass}
                required
                rows={3}
                maxLength={field.max}
                placeholder={field.placeholder}
                value={fields[field.key]}
                onChange={(e) =>
                  setFields({ ...fields, [field.key]: e.target.value })
                }
              />
            ) : (
              <input
                className={fieldClass}
                required
                maxLength={field.max}
                type={field.key === "email" ? "email" : "text"}
                inputMode={field.key === "nim" ? "numeric" : undefined}
                placeholder={field.placeholder}
                value={fields[field.key]}
                onChange={(e) =>
                  setFields({ ...fields, [field.key]: e.target.value })
                }
              />
            )}
          </label>
        ))}
      </div>
      {!reportId ? (
        <>
          <label className="grid gap-2 text-sm font-bold">
            Kategori
            <select
              className={fieldClass}
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Pilih kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              checked={contactAllowed}
              onChange={(e) => setContactAllowed(e.target.checked)}
            />
            Mahasiswa mengizinkan BEM menghubungi kontak di atas.
          </label>
          <label className="flex gap-3 text-sm">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Mahasiswa mengetahui pencatatan ini serta menyetujui kebijakan
            privasi dan etika pelaporan.
          </label>
        </>
      ) : (
        <label className="grid gap-2 text-sm font-bold">
          Alasan koreksi
          <textarea
            className={fieldClass}
            required
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: pelapor mengonfirmasi koreksi kontak. Tidak perlu menyalin nilai kontak ke alasan."
          />
        </label>
      )}
      {message && (
        <p role="status" className="text-brand text-sm">
          {message}
        </p>
      )}
      <button
        className="bg-brand rounded-control min-h-11 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        disabled={saving}
        type="submit"
      >
        {saving ? "Menyimpan…" : reportId ? "Simpan koreksi" : "Buat laporan"}
      </button>
    </form>
  );
}
