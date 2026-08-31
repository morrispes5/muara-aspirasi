"use client";

import { Container } from "@/components/layout/container";
import { StateCard } from "@/components/ui/state-card";

/**
 * Route-level error boundary. Without one, an uncaught render error — a
 * database outage while `/update/[slug]` loads, for example, since the detail
 * pages let `getPublishedContent` throw — falls through to the framework's
 * default error screen instead of this application's own safe error state.
 *
 * The `error` argument is deliberately not rendered. `docs/SECURITY_PRIVACY.md`
 * section 8 requires that a public error expose no stack trace, query, or
 * provider response, and `error.message` can carry all three. Next.js also
 * attaches `error.digest`; it is left out because a reference ID is only useful
 * once there is an operational process to look it up, and that process is an
 * owner decision that has not been made.
 */
export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="flex-1 pt-28 pb-16" id="konten-utama">
      <Container className="grid max-w-2xl gap-6">
        <StateCard
          description="Halaman ini gagal dimuat. Tidak ada data yang dikirim ke halaman ini, dan kamu dapat mencoba lagi."
          headingLevel="h1"
          title="Terjadi kendala sementara"
          tone="error"
        />
        <div>
          <button
            className="bg-brand rounded-control hover:bg-brand-dark min-h-11 px-5 text-sm font-bold text-white"
            onClick={reset}
            type="button"
          >
            Coba lagi
          </button>
        </div>
      </Container>
    </main>
  );
}
