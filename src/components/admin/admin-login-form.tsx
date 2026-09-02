"use client";

import { FormEvent, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
import { useRouter } from "next/navigation";

const authClient = createAuthClient({
  plugins: [twoFactorClient({ twoFactorPage: "/admin/2fa" })],
});

type AdminLoginFormProps = {
  mfaRequired: boolean;
  redirectPath: string;
};

export function AdminLoginForm({
  mfaRequired,
  redirectPath,
}: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({
      email: email.trim().toLowerCase(),
      password,
    });

    if (result.error) {
      setErrorMessage(
        "Masuk belum berhasil. Periksa email dan kata sandi, atau hubungi admin jika akun belum aktif.",
      );
      setIsSubmitting(false);
      return;
    }

    const authResultData = result.data as
      { twoFactorRedirect?: unknown; user?: unknown } | undefined;
    if (authResultData?.twoFactorRedirect === true) {
      router.replace(`/admin/2fa?next=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const signedInUser = result.data?.user as
      { role?: unknown; twoFactorEnabled?: unknown } | undefined;
    if (
      mfaRequired &&
      signedInUser?.role === "ADMIN" &&
      signedInUser.twoFactorEnabled !== true
    ) {
      router.replace(
        `/admin/security?next=${encodeURIComponent(redirectPath)}`,
      );
      router.refresh();
      return;
    }

    router.replace(redirectPath);
    router.refresh();
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <label className="text-ink text-sm font-bold" htmlFor="admin-email">
          Email BEM
        </label>
        <input
          autoComplete="username"
          className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 text-sm outline-none"
          id="admin-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="grid gap-2">
        <label className="text-ink text-sm font-bold" htmlFor="admin-password">
          Kata sandi
        </label>
        <input
          autoComplete="current-password"
          className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 text-sm outline-none"
          id="admin-password"
          minLength={12}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <p className="text-muted text-xs leading-5">
          Gunakan akun BEM yang dibuat oleh admin. Pendaftaran publik tidak
          tersedia.
        </p>
      </div>
      {errorMessage ? (
        <p
          aria-live="polite"
          className="border-danger bg-danger-soft text-danger rounded-control border px-3 py-3 text-sm leading-6"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      <button
        className="bg-brand hover:bg-brand-dark focus-visible:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white transition-colors disabled:cursor-wait disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Memeriksa akses…" : "Masuk ke ruang BEM"}
      </button>
    </form>
  );
}
