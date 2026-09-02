"use client";

import { FormEvent, useState } from "react";

type Timeline = {
  events: Array<{
    createdAt: string;
    message: string | null;
    status: string | null;
  }>;
  lastUpdatedAt: string;
  publicUpdates: Array<{
    publishedAt: string;
    slug: string;
    summary: string;
    title: string;
  }>;
  status: string;
  submittedAt: string;
  trackingCode: string;
};

const statusLabels: Record<string, string> = {
  ACTION_TAKEN: "Tindakan dilakukan",
  CANNOT_PROCESS: "Belum dapat diproses",
  IN_COORDINATION: "Dalam koordinasi",
  NEEDS_CLARIFICATION: "Perlu klarifikasi",
  RECEIVED: "Laporan diterima",
  RESOLVED: "Selesai ditindaklanjuti",
  UNDER_REVIEW: "Sedang ditinjau BEM",
  UPDATE_AVAILABLE: "Pembaruan tersedia",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function TrackingForm() {
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingSecret, setTrackingSecret] = useState("");
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTimeline(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/aspirasi/lacak", {
        body: JSON.stringify({ trackingCode, trackingSecret }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json()) as {
        error?: { message?: string };
        timeline?: Timeline;
      };

      if (!response.ok || !body.timeline) {
        throw new Error(
          body.error?.message ??
            "Kode atau token rahasia tidak cocok. Periksa kembali keduanya.",
        );
      }

      setTimeline(body.timeline);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pelacakan belum berhasil. Coba lagi beberapa saat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form className="grid gap-5" onSubmit={submit}>
        <label className="text-ink grid gap-2 text-sm font-bold">
          Kode pelacakan
          <input
            autoCapitalize="characters"
            autoComplete="off"
            className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 font-mono text-sm outline-none"
            maxLength={32}
            onChange={(event) => setTrackingCode(event.target.value)}
            placeholder="MA-XXXXXXXXXXXXXXXX"
            required
            value={trackingCode}
          />
        </label>
        <label className="text-ink grid gap-2 text-sm font-bold">
          Token rahasia
          <input
            autoComplete="off"
            className="border-line bg-surface text-ink focus:border-brand rounded-control w-full border px-3 py-3 font-mono text-sm outline-none"
            maxLength={128}
            onChange={(event) => setTrackingSecret(event.target.value)}
            required
            type="password"
            value={trackingSecret}
          />
          <span className="text-muted text-xs leading-5 font-normal">
            Kode saja tidak cukup. Token tidak pernah masuk ke tautan atau
            ditampilkan ulang oleh BEM.
          </span>
        </label>
        <button
          className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Memeriksa dengan aman…" : "Lacak aspirasi"}
        </button>
      </form>

      {errorMessage ? (
        <p
          aria-live="polite"
          className="border-danger bg-danger-soft text-danger rounded-control border p-3 text-sm leading-6"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {timeline ? (
        <section aria-live="polite" className="grid gap-5">
          <div className="border-success/25 bg-success-soft rounded-card border p-5">
            <p className="text-success text-sm font-bold">
              {statusLabels[timeline.status] ?? "Pembaruan aspirasi"}
            </p>
            <p className="text-muted mt-2 text-sm leading-6">
              Kode {timeline.trackingCode} · terakhir diperbarui{" "}
              {formatDate(timeline.lastUpdatedAt)}
            </p>
          </div>
          {timeline.publicUpdates.length ? (
            <section className="border-brand/25 bg-brand-soft rounded-card border p-5">
              <p className="text-brand text-sm font-bold">
                Update publik terkait
              </p>
              <div className="mt-4 grid gap-3">
                {timeline.publicUpdates.map((update) => (
                  <article
                    className="rounded-control border-line bg-surface border p-4"
                    key={update.slug}
                  >
                    <a
                      className="text-ink hover:text-brand font-bold"
                      href={`/update/${update.slug}`}
                    >
                      {update.title}
                    </a>
                    <p className="text-muted mt-2 text-sm leading-6">
                      {update.summary}
                    </p>
                    <time
                      className="text-muted mt-2 block text-xs"
                      dateTime={update.publishedAt}
                    >
                      Dipublikasikan {formatDate(update.publishedAt)}
                    </time>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          <ol className="border-line rounded-card grid gap-5 border bg-white p-5 sm:p-6">
            {timeline.events.map((event, index) => (
              <li
                className="border-line grid gap-2 border-l pl-4"
                key={`${event.createdAt}-${index}`}
              >
                <p className="text-ink text-sm font-bold">
                  {event.status
                    ? (statusLabels[event.status] ?? event.status)
                    : "Pembaruan"}
                </p>
                {event.message ? (
                  <p className="text-muted text-sm leading-6">
                    {event.message}
                  </p>
                ) : null}
                <time className="text-muted text-xs" dateTime={event.createdAt}>
                  {formatDate(event.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
