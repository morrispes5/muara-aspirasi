"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { useState } from "react";

const authClient = createAuthClient({
  plugins: [twoFactorClient({ twoFactorPage: "/admin/2fa" })],
});

type AdminTwoFactorProps = {
  nextPath: string;
  twoFactorEnabled: boolean;
};

type SetupData = {
  backupCodes: string[];
  totpURI: string;
};

function responseMessage(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export function AdminTwoFactor({
  nextPath,
  twoFactorEnabled,
}: AdminTwoFactorProps) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function startSetup() {
    setErrorMessage(null);
    setIsBusy(true);

    const result = await authClient.twoFactor.enable({
      method: "totp",
      password,
    });
    const setupData = result.data;

    setIsBusy(false);
    if (
      result.error ||
      !setupData ||
      setupData.method !== "totp" ||
      !setupData.totpURI ||
      !setupData.backupCodes
    ) {
      setErrorMessage(
        responseMessage(
          result.error,
          "MFA belum dapat disiapkan. Periksa kata sandi dan coba lagi.",
        ),
      );
      return;
    }

    setSetup({
      backupCodes: setupData.backupCodes,
      totpURI: setupData.totpURI,
    });
  }

  async function verifySetup() {
    setErrorMessage(null);
    setIsBusy(true);

    const result = await authClient.twoFactor.verifyTotp({
      code: code.trim(),
      trustDevice: false,
    });

    setIsBusy(false);
    if (result.error) {
      setErrorMessage(
        responseMessage(result.error, "Kode authenticator belum benar."),
      );
      return;
    }

    window.location.assign(nextPath);
  }

  if (twoFactorEnabled) {
    return (
      <div className="grid gap-5">
        <div className="border-success/25 bg-success-soft rounded-card border p-4">
          <p className="text-success text-sm font-bold">MFA aktif</p>
          <p className="text-muted mt-2 text-sm leading-6">
            Akun ini memakai TOTP dan tidak mempercayai perangkat secara
            permanen. Simpan backup code di tempat yang aman.
          </p>
        </div>
        <a
          className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-center text-sm font-bold text-white"
          href={nextPath}
        >
          Kembali ke ruang kerja BEM
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {!setup ? (
        <>
          <p className="text-muted text-sm leading-6">
            Untuk akun ADMIN, aktifkan authenticator app sebelum mengelola
            laporan, user, atau publikasi.
          </p>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Konfirmasi kata sandi
            <input
              autoComplete="current-password"
              className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 text-sm outline-none"
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button
            className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            disabled={isBusy || password.length < 12}
            onClick={startSetup}
            type="button"
          >
            {isBusy ? "Menyiapkan MFA…" : "Mulai pengaturan MFA"}
          </button>
        </>
      ) : (
        <>
          <div className="border-line rounded-card border bg-white p-4 text-sm leading-6">
            <p className="text-ink font-bold">
              1. Tambahkan akun ke authenticator
            </p>
            <p className="text-muted mt-2">
              Gunakan QR/import URI dari aplikasi authenticator. URI hanya
              ditampilkan pada sesi setup ini.
            </p>
            <code className="text-muted mt-3 block max-h-24 overflow-auto text-xs break-all">
              {setup.totpURI}
            </code>
          </div>
          <div className="border-warning/25 bg-warning-soft rounded-card border p-4 text-sm leading-6">
            <p className="text-warning font-bold">
              Backup code — simpan sekarang
            </p>
            <p className="text-muted mt-2">
              Kode ini hanya ditampilkan pada tahap ini.
            </p>
            <code className="text-ink mt-3 grid grid-cols-2 gap-2 text-xs">
              {setup.backupCodes.map((backupCode) => (
                <span key={backupCode}>{backupCode}</span>
              ))}
            </code>
          </div>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Kode dari authenticator
            <input
              autoComplete="one-time-code"
              className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 font-mono text-sm outline-none"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              pattern="[0-9]{6}"
              required
              value={code}
            />
          </label>
          <button
            className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            disabled={isBusy || code.trim().length !== 6}
            onClick={verifySetup}
            type="button"
          >
            {isBusy ? "Memverifikasi…" : "Aktifkan MFA"}
          </button>
        </>
      )}
      {errorMessage ? (
        <p
          aria-live="polite"
          className="border-danger bg-danger-soft text-danger rounded-control border p-3 text-sm leading-6"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
