"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

import { readJsonResponse } from "@/lib/json-response";

type CategoryOption = {
  id: string;
  name: string;
};

type AspirationFormProps = {
  categories: CategoryOption[];
  evidenceEnabled: boolean;
  turnstileSiteKey: string;
};

type FormValues = {
  categoryId: string;
  chronology: string;
  contactAllowed: boolean;
  email: string;
  ethicsAccepted: boolean;
  identityMode: "CONFIDENTIAL_BEM_ONLY" | "CONSENTED_LIMITED_SHARE";
  impact: string;
  limitedShareConsent: boolean;
  location: string;
  name: string;
  nim: string;
  suggestedSolution: string;
  title: string;
  whatsapp: string;
};

type Receipt = {
  trackingCode: string;
  trackingSecret: string;
};

type EvidenceUpload = {
  id: string;
  uploadUrl: string;
  headers: Record<string, string>;
};

const maxEvidenceFiles = 3;
const maxEvidenceFileBytes = 5 * 1024 * 1024;
const maxEvidenceTotalBytes = 10 * 1024 * 1024;
const supportedEvidenceTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      callback: (token: string) => void;
      "error-callback": () => void;
      sitekey: string;
      theme: "light";
    },
  ) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const initialValues: FormValues = {
  categoryId: "",
  chronology: "",
  contactAllowed: false,
  email: "",
  ethicsAccepted: false,
  identityMode: "CONFIDENTIAL_BEM_ONLY",
  impact: "",
  limitedShareConsent: false,
  location: "",
  name: "",
  nim: "",
  suggestedSolution: "",
  title: "",
  whatsapp: "",
};

const steps = ["Identitas", "Aspirasi", "Privasi", "Tinjau"] as const;

function inputClassName() {
  return "border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 text-sm outline-none";
}

function fieldErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Pengiriman belum berhasil. Coba lagi beberapa saat.";
  }

  const message = (error as { message?: unknown }).message;
  return typeof message === "string"
    ? message
    : "Pengiriman belum berhasil. Coba lagi beberapa saat.";
}

export function AspirationForm({
  categories,
  evidenceEnabled,
  turnstileSiteKey,
}: AspirationFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const turnstileContainer = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  const setValue = useCallback(
    <Key extends keyof FormValues>(key: Key, value: FormValues[Key]) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  useEffect(() => {
    if (
      activeStep !== 3 ||
      !turnstileReady ||
      !turnstileContainer.current ||
      widgetId.current ||
      !window.turnstile
    ) {
      return;
    }

    widgetId.current = window.turnstile.render(turnstileContainer.current, {
      callback: (token) => {
        setErrorMessage((current) =>
          current === "Verifikasi anti-spam perlu dimuat ulang." ||
          current === "Selesaikan verifikasi anti-spam sebelum mengirim."
            ? null
            : current,
        );
        setTurnstileToken(token);
      },
      "error-callback": () => {
        setTurnstileToken("");
        setErrorMessage("Verifikasi anti-spam perlu dimuat ulang.");
      },
      sitekey: turnstileSiteKey,
      theme: "light",
    });
  }, [activeStep, turnstileReady, turnstileSiteKey]);

  function nextStep() {
    setErrorMessage(null);
    if (activeStep === 0 && (!values.name.trim() || !values.nim.trim())) {
      setErrorMessage("Lengkapi nama lengkap dan NIM sebelum melanjutkan.");
      return;
    }
    if (
      activeStep === 1 &&
      (!values.categoryId ||
        !values.title.trim() ||
        !values.location.trim() ||
        !values.chronology.trim() ||
        !values.impact.trim())
    ) {
      setErrorMessage(
        "Lengkapi kategori dan detail aspirasi sebelum melanjutkan.",
      );
      return;
    }
    if (
      activeStep === 2 &&
      (!values.ethicsAccepted ||
        (values.identityMode === "CONSENTED_LIMITED_SHARE" &&
          !values.limitedShareConsent))
    ) {
      setErrorMessage(
        "Lengkapi persetujuan privasi dan etika sebelum melanjutkan.",
      );
      return;
    }
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setErrorMessage(null);
    if (activeStep === 3) {
      widgetId.current = null;
      setTurnstileToken("");
    }
    setActiveStep((current) => Math.max(current - 1, 0));
  }

  function selectEvidence(files: FileList | null) {
    const nextFiles = files ? Array.from(files) : [];
    const totalBytes = nextFiles.reduce((sum, file) => sum + file.size, 0);

    if (nextFiles.length > maxEvidenceFiles) {
      setErrorMessage(`Pilih maksimal ${maxEvidenceFiles} file evidence.`);
      return;
    }
    if (
      nextFiles.some(
        (file) =>
          !supportedEvidenceTypes.has(file.type) ||
          file.size < 1 ||
          file.size > maxEvidenceFileBytes,
      )
    ) {
      setErrorMessage(
        "Evidence hanya boleh JPEG, PNG, atau PDF maksimal 5 MB per file.",
      );
      return;
    }
    if (totalBytes > maxEvidenceTotalBytes) {
      setErrorMessage("Ukuran total evidence maksimal 10 MB.");
      return;
    }

    setErrorMessage(null);
    setEvidenceFiles(nextFiles);
  }

  async function uploadEvidence() {
    if (!evidenceFiles.length) return [] as Array<{ intentId: string }>;

    const intentResponse = await fetch("/api/aspirasi/evidence/intents", {
      body: JSON.stringify({
        files: evidenceFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const intentBody = (await intentResponse.json()) as {
      error?: unknown;
      uploads?: EvidenceUpload[];
    };

    if (!intentResponse.ok || !intentBody.uploads) {
      throw intentBody.error;
    }

    if (intentBody.uploads.length !== evidenceFiles.length) {
      throw new Error("Sesi upload evidence belum lengkap.");
    }

    setIsUploadingEvidence(true);
    try {
      await Promise.all(
        intentBody.uploads.map(async (upload, index) => {
          const response = await fetch(upload.uploadUrl, {
            body: evidenceFiles[index],
            headers: upload.headers,
            method: "PUT",
          });
          if (!response.ok) {
            throw new Error("File evidence belum berhasil diunggah.");
          }
        }),
      );
    } finally {
      setIsUploadingEvidence(false);
    }

    return intentBody.uploads.map((upload) => ({ intentId: upload.id }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!turnstileToken) {
      setErrorMessage("Selesaikan verifikasi anti-spam sebelum mengirim.");
      return;
    }

    const submissionKey = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(submissionKey);
    setIsSubmitting(true);

    try {
      const evidence = evidenceEnabled ? await uploadEvidence() : [];
      const response = await fetch("/api/aspirasi", {
        body: JSON.stringify({
          ...values,
          evidence,
          honeypot,
          turnstileToken,
        }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submissionKey,
        },
        method: "POST",
      });
      const body = await readJsonResponse<{
        error?: unknown;
        receipt?: Receipt;
      }>(response);

      if (!response.ok || !body.receipt) {
        throw body.error;
      }

      setReceipt(body.receipt);
    } catch (error) {
      if (widgetId.current) {
        window.turnstile?.reset(widgetId.current);
        setTurnstileToken("");
      }
      setErrorMessage(fieldErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyReceipt() {
    if (!receipt) {
      return;
    }

    await navigator.clipboard?.writeText(
      `Kode pelacakan: ${receipt.trackingCode}\nToken rahasia: ${receipt.trackingSecret}`,
    );
  }

  if (receipt) {
    return (
      <section aria-labelledby="receipt-title" className="grid gap-5">
        <div className="border-success/25 bg-success-soft rounded-card border p-5 sm:p-6">
          <p className="text-success text-sm font-bold">Laporan diterima</p>
          <h2 className="text-ink mt-2 text-2xl font-bold" id="receipt-title">
            Simpan dua kredensial ini sekarang.
          </h2>
          <p className="text-muted mt-3 text-sm leading-6">
            Token rahasia hanya ditampilkan sekali dan tidak dapat dipulihkan
            oleh BEM. Jangan bagikan token ini kepada siapa pun.
          </p>
        </div>
        <dl className="border-line rounded-card grid gap-4 border bg-white p-5 font-mono text-sm sm:grid-cols-2 sm:p-6">
          <div className="grid gap-2">
            <dt className="text-muted font-sans text-xs font-bold tracking-[0.12em] uppercase">
              Kode pelacakan
            </dt>
            <dd className="text-ink text-base font-bold break-all">
              {receipt.trackingCode}
            </dd>
          </div>
          <div className="grid gap-2">
            <dt className="text-muted font-sans text-xs font-bold tracking-[0.12em] uppercase">
              Token rahasia
            </dt>
            <dd className="text-ink text-base font-bold break-all">
              {receipt.trackingSecret}
            </dd>
          </div>
        </dl>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white"
            onClick={copyReceipt}
            type="button"
          >
            Salin kode dan token
          </button>
          <a
            className="border-line text-ink hover:border-brand rounded-full border px-5 py-3 text-center text-sm font-bold"
            href="/aspirasi/lacak"
          >
            Lacak aspirasi nanti
          </a>
        </div>
      </section>
    );
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <Script
        onLoad={() => setTurnstileReady(true)}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <ol className="grid grid-cols-4 gap-2" aria-label="Tahap pengiriman">
        {steps.map((step, index) => (
          <li key={step}>
            <span
              className={`block border-t-2 pt-2 text-xs font-bold ${
                index <= activeStep
                  ? "border-brand text-brand"
                  : "border-line text-muted"
              }`}
            >
              {index + 1}. {step}
            </span>
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="absolute -left-[10000px] h-px w-px overflow-hidden"
      >
        <label htmlFor="report-website">Website</label>
        <input
          autoComplete="off"
          id="report-website"
          name="website"
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          type="text"
          value={honeypot}
        />
      </div>

      {activeStep === 0 ? (
        <fieldset className="grid gap-5">
          <legend className="text-ink text-xl font-bold">
            Identitas untuk verifikasi BEM
          </legend>
          <p className="text-muted -mt-2 text-sm leading-6">
            Nama dan NIM hanya dipakai BEM untuk memeriksa laporan. Jangan
            masukkan kata sandi, OTP, atau data orang lain yang tidak perlu.
          </p>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Nama lengkap
            <input
              className={inputClassName()}
              maxLength={160}
              onChange={(event) => setValue("name", event.target.value)}
              required
              value={values.name}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            NIM
            <input
              className={inputClassName()}
              maxLength={32}
              onChange={(event) => setValue("nim", event.target.value)}
              required
              value={values.nim}
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-ink grid gap-2 text-sm font-bold">
              Email <span className="text-muted font-normal">(opsional)</span>
              <input
                className={inputClassName()}
                inputMode="email"
                maxLength={320}
                onChange={(event) => setValue("email", event.target.value)}
                type="email"
                value={values.email}
              />
            </label>
            <label className="text-ink grid gap-2 text-sm font-bold">
              WhatsApp{" "}
              <span className="text-muted font-normal">(opsional)</span>
              <input
                className={inputClassName()}
                inputMode="tel"
                maxLength={32}
                onChange={(event) => setValue("whatsapp", event.target.value)}
                type="tel"
                value={values.whatsapp}
              />
            </label>
          </div>
          <label className="text-ink flex items-start gap-3 text-sm leading-6">
            <input
              checked={values.contactAllowed}
              className="mt-1 size-4"
              onChange={(event) =>
                setValue("contactAllowed", event.target.checked)
              }
              type="checkbox"
            />
            BEM boleh menghubungi saya melalui kontak yang saya isi bila perlu
            klarifikasi.
          </label>
        </fieldset>
      ) : null}

      {activeStep === 1 ? (
        <fieldset className="grid gap-5">
          <legend className="text-ink text-xl font-bold">
            Detail aspirasi
          </legend>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Kategori
            <select
              className={inputClassName()}
              onChange={(event) => setValue("categoryId", event.target.value)}
              required
              value={values.categoryId}
            >
              <option value="">Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Judul masalah atau ide
            <input
              className={inputClassName()}
              maxLength={200}
              onChange={(event) => setValue("title", event.target.value)}
              required
              value={values.title}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Lokasi atau area
            <input
              className={inputClassName()}
              maxLength={200}
              onChange={(event) => setValue("location", event.target.value)}
              required
              value={values.location}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Kronologi
            <textarea
              className={`${inputClassName()} min-h-32 resize-y`}
              maxLength={5000}
              onChange={(event) => setValue("chronology", event.target.value)}
              required
              value={values.chronology}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Dampak yang dirasakan
            <textarea
              className={`${inputClassName()} min-h-28 resize-y`}
              maxLength={3000}
              onChange={(event) => setValue("impact", event.target.value)}
              required
              value={values.impact}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Usulan solusi{" "}
            <span className="text-muted font-normal">(opsional)</span>
            <textarea
              className={`${inputClassName()} min-h-28 resize-y`}
              maxLength={3000}
              onChange={(event) =>
                setValue("suggestedSolution", event.target.value)
              }
              value={values.suggestedSolution}
            />
          </label>
          {evidenceEnabled ? (
            <label className="text-ink grid gap-2 text-sm font-bold">
              Bukti pendukung{" "}
              <span className="text-muted font-normal">(opsional)</span>
              <input
                accept="image/jpeg,image/png,application/pdf"
                className="border-line bg-surface text-ink rounded-control w-full border p-3 text-sm"
                multiple
                onChange={(event) => selectEvidence(event.target.files)}
                type="file"
              />
              <span className="text-muted text-xs leading-5">
                Maksimal 3 file, JPEG/PNG/PDF, 5 MB per file dan 10 MB total.
                File masuk ke penyimpanan privat dan tetap berada dalam status
                karantina untuk akses BEM.
              </span>
              {evidenceFiles.length ? (
                <ul className="text-muted grid gap-1 text-xs font-normal">
                  {evidenceFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`}>
                      {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>
          ) : (
            <p className="border-warning/25 bg-warning-soft text-warning rounded-control border p-3 text-sm leading-6">
              Upload bukti belum dibuka. BEM hanya menerima bukti setelah R2
              privat dan aturan file disetujui.
            </p>
          )}
        </fieldset>
      ) : null}

      {activeStep === 2 ? (
        <fieldset className="grid gap-5">
          <legend className="text-ink text-xl font-bold">
            Privasi dan etika
          </legend>
          <label
            className={`rounded-control grid gap-2 border p-4 ${values.identityMode === "CONFIDENTIAL_BEM_ONLY" ? "border-brand bg-brand-soft" : "border-line"}`}
          >
            <span className="flex items-start gap-3 text-sm font-bold">
              <input
                checked={values.identityMode === "CONFIDENTIAL_BEM_ONLY"}
                name="identity-mode"
                onChange={() =>
                  setValue("identityMode", "CONFIDENTIAL_BEM_ONLY")
                }
                type="radio"
              />
              Rahasia untuk BEM saja
            </span>
            <span className="text-muted text-sm leading-6">
              Nama dan NIM tidak dibagikan ke FTI atau publik.
            </span>
          </label>
          <label
            className={`rounded-control grid gap-2 border p-4 ${values.identityMode === "CONSENTED_LIMITED_SHARE" ? "border-brand bg-brand-soft" : "border-line"}`}
          >
            <span className="flex items-start gap-3 text-sm font-bold">
              <input
                checked={values.identityMode === "CONSENTED_LIMITED_SHARE"}
                name="identity-mode"
                onChange={() =>
                  setValue("identityMode", "CONSENTED_LIMITED_SHARE")
                }
                type="radio"
              />
              Setuju berbagi terbatas
            </span>
            <span className="text-muted text-sm leading-6">
              BEM dapat menggunakan identitas minimum secara privat hanya untuk
              koordinasi dengan unit FTI yang relevan.
            </span>
          </label>
          {values.identityMode === "CONSENTED_LIMITED_SHARE" ? (
            <label className="text-ink flex items-start gap-3 text-sm leading-6">
              <input
                checked={values.limitedShareConsent}
                className="mt-1 size-4"
                onChange={(event) =>
                  setValue("limitedShareConsent", event.target.checked)
                }
                required
                type="checkbox"
              />
              Saya setuju atas berbagi terbatas ini untuk tindak lanjut privat
              yang relevan.
            </label>
          ) : null}
          <label className="text-ink flex items-start gap-3 text-sm leading-6">
            <input
              checked={values.ethicsAccepted}
              className="mt-1 size-4"
              onChange={(event) =>
                setValue("ethicsAccepted", event.target.checked)
              }
              required
              type="checkbox"
            />
            Saya sudah membaca etika pelaporan, tidak memasukkan tuduhan tanpa
            dasar atau data sensitif yang tidak diperlukan, dan memahami layanan
            ini bukan kanal darurat.
          </label>
        </fieldset>
      ) : null}

      {activeStep === 3 ? (
        <fieldset className="grid gap-5">
          <legend className="text-ink text-xl font-bold">
            Tinjau sebelum mengirim
          </legend>
          <div className="border-line rounded-card grid gap-3 border bg-white p-5 text-sm leading-6">
            <p>
              <strong>Identitas:</strong> {values.name || "Belum diisi"} ·{" "}
              {values.nim || "Belum diisi"}
            </p>
            <p>
              <strong>Aspirasi:</strong> {values.title || "Belum diisi"}
            </p>
            <p>
              <strong>Privasi:</strong>{" "}
              {values.identityMode === "CONFIDENTIAL_BEM_ONLY"
                ? "Rahasia untuk BEM saja"
                : "Setuju berbagi terbatas"}
            </p>
            <p>
              <strong>Bukti:</strong>{" "}
              {evidenceFiles.length
                ? `${evidenceFiles.length} file privat dipilih`
                : "Tidak ada"}
            </p>
          </div>
          <div className="grid gap-2">
            <p className="text-ink text-sm font-bold">Verifikasi anti-spam</p>
            <div ref={turnstileContainer} />
            {!turnstileReady ? (
              <p className="text-muted text-sm">Memuat verifikasi…</p>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {errorMessage ? (
        <p
          aria-live="polite"
          className="border-danger bg-danger-soft text-danger rounded-control border p-3 text-sm leading-6"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {activeStep > 0 ? (
          <button
            className="border-line text-ink hover:border-brand min-h-11 rounded-full border px-5 py-3 text-sm font-bold"
            onClick={previousStep}
            type="button"
          >
            Kembali
          </button>
        ) : (
          <span />
        )}
        {activeStep < 3 ? (
          <button
            className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white"
            onClick={nextStep}
            type="button"
          >
            Lanjut
          </button>
        ) : (
          <button
            className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isUploadingEvidence
              ? "Mengunggah bukti privat…"
              : isSubmitting
                ? "Mengirim dengan aman…"
                : "Kirim aspirasi"}
          </button>
        )}
      </div>
    </form>
  );
}
