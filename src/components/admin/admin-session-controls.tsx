"use client";

import { createAuthClient } from "better-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const authClient = createAuthClient();

export function AdminSessionControls() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function revokeOtherSessions() {
    setIsRevoking(true);
    setMessage(null);

    const result = await authClient.revokeOtherSessions();

    setIsRevoking(false);
    setMessage(
      result.error
        ? "Sesi perangkat lain belum dapat dicabut. Coba lagi."
        : "Sesi di perangkat lain sudah dicabut.",
    );
  }

  async function signOut() {
    setIsSigningOut(true);
    setMessage(null);

    const result = await authClient.signOut();

    if (result.error) {
      setIsSigningOut(false);
      setMessage("Sesi belum dapat diakhiri. Coba lagi.");
      return;
    }

    router.replace("/admin/login");
    router.refresh();
    window.setTimeout(() => window.location.reload(), 0);
  }

  return (
    <div className="grid gap-2">
      <button
        className="border-line text-ink hover:border-brand hover:bg-brand-soft min-h-11 rounded-full border px-4 py-2 text-left text-sm font-bold transition-colors disabled:cursor-wait disabled:opacity-60"
        disabled={isRevoking}
        onClick={revokeOtherSessions}
        type="button"
      >
        {isRevoking ? "Mencabut sesi…" : "Cabut sesi perangkat lain"}
      </button>
      <button
        className="border-danger/35 text-danger hover:bg-danger-soft min-h-11 rounded-full border px-4 py-2 text-left text-sm font-bold transition-colors"
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        {isSigningOut ? "Mengakhiri sesi…" : "Keluar"}
      </button>
      {message ? (
        <p aria-live="polite" className="text-muted text-xs leading-5">
          {message}
        </p>
      ) : null}
    </div>
  );
}
