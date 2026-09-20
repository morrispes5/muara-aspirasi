"use client";

import { useState } from "react";

import {
  formatTrackingReceipt,
  type TrackingCredential,
} from "@/lib/tracking-receipt";

export function TrackingReceipt({ receipt }: { receipt: TrackingCredential }) {
  const [feedback, setFeedback] = useState("");
  const value = formatTrackingReceipt(receipt);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback("Bukti disalin. Simpan di catatan pribadi kamu.");
    } catch {
      setFeedback(
        "Salin otomatis belum tersedia. Pilih teks bukti di bawah atau unduh file.",
      );
    }
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([value], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `bukti-${receipt.trackingCode}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback("File bukti disiapkan. Simpan hanya di perangkat pribadi.");
  }

  return (
    <section aria-labelledby="receipt-title" className="grid gap-5">
      <div className="border-success/25 bg-success-soft rounded-card border p-5 sm:p-6">
        <p className="text-success text-sm font-bold">Laporan diterima</p>
        <h2 className="text-ink mt-2 text-2xl font-bold" id="receipt-title">
          Simpan bukti, lacak kapan saja.
        </h2>
        <p className="text-muted mt-3 text-sm leading-6">
          Salin atau unduh satu bukti ini. Saat ingin melihat kabar dari BEM,
          tempelkan di Lacak Aspirasi.
        </p>
      </div>
      <label className="text-ink grid gap-2 text-sm font-bold">
        Bukti pelacakan pribadi
        <textarea
          className="border-line rounded-control w-full border bg-white p-4 font-mono text-sm break-all"
          readOnly
          rows={3}
          value={value}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <p className="text-muted text-sm leading-6">
        Bukti ini berisi kunci rahasia. Siapa pun yang memegangnya dapat melihat
        progres laporan. Jangan bagikan; BEM tidak dapat menerbitkannya ulang
        jika hilang.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white"
          onClick={copy}
          type="button"
        >
          Salin bukti
        </button>
        <button
          className="border-line text-ink hover:border-brand min-h-11 rounded-full border px-5 py-3 text-sm font-bold"
          onClick={download}
          type="button"
        >
          Unduh bukti (.txt)
        </button>
        <a
          className="text-brand min-h-11 px-3 py-3 text-sm font-bold underline underline-offset-4"
          href="/aspirasi/lacak"
        >
          Buka pelacakan
        </a>
      </div>
      <p role="status" className="text-muted text-sm">
        {feedback}
      </p>
    </section>
  );
}
