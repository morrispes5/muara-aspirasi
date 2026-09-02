"use client";

import { FormEvent, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [twoFactorClient({ twoFactorPage: "/admin/2fa" })],
});

type AdminTwoFactorChallengeProps = {
  nextPath: string;
};

function responseMessage(value: unknown) {
  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Kode MFA belum benar atau sesi tantangan sudah kedaluwarsa.";
}

export function AdminTwoFactorChallenge({
  nextPath,
}: AdminTwoFactorChallengeProps) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = useBackupCode
      ? await authClient.twoFactor.verifyBackupCode({
          code: code.trim(),
          trustDevice: false,
        })
      : await authClient.twoFactor.verifyTotp({
          code: code.trim(),
          trustDevice: false,
        });

    setIsSubmitting(false);
    if (result.error) {
      setErrorMessage(responseMessage(result.error));
      return;
    }

    window.location.assign(nextPath);
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <p className="text-muted text-sm leading-6">
        Masukkan kode enam digit dari authenticator app. Backup code hanya
        dipakai bila authenticator tidak dapat diakses.
      </p>
      <label className="text-ink grid gap-2 text-sm font-bold">
        {useBackupCode ? "Backup code" : "Kode authenticator"}
        <input
          autoComplete="one-time-code"
          className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 font-mono text-sm outline-none"
          inputMode={useBackupCode ? "text" : "numeric"}
          maxLength={useBackupCode ? 32 : 6}
          onChange={(event) => setCode(event.target.value)}
          required
          value={code}
        />
      </label>
      <button
        className="text-brand hover:text-brand-dark text-left text-sm font-bold underline underline-offset-4"
        onClick={() => {
          setCode("");
          setUseBackupCode((current) => !current);
        }}
        type="button"
      >
        {useBackupCode ? "Gunakan authenticator app" : "Gunakan backup code"}
      </button>
      {errorMessage ? (
        <p
          aria-live="polite"
          className="border-danger bg-danger-soft text-danger rounded-control border p-3 text-sm leading-6"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <button
        className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        disabled={isSubmitting || !code.trim()}
        type="submit"
      >
        {isSubmitting ? "Memverifikasi…" : "Lanjutkan"}
      </button>
    </form>
  );
}
