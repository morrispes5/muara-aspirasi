import {
  consumeTrackingRateLimits,
  PublicRateLimitError,
} from "@/server/aspirations/rate-limit";
import {
  parseTrackingInput,
  PublicInputError,
} from "@/server/aspirations/validation";
import {
  publicError,
  publicSensitiveResponseHeaders,
} from "@/server/aspirations/public-response";

import { findReporterTimeline } from "@/server/aspirations/tracking-service";
import { isSameOriginRequest } from "@/server/security/origin";
import { NextResponse } from "next/server";
import { readBoundedJson } from "@/server/security/request-body";

export const runtime = "nodejs";

const genericTrackingFailure = () =>
  publicError(
    404,
    "TRACKING_NOT_FOUND",
    "Kode atau token rahasia tidak cocok. Periksa kembali keduanya.",
  );

export async function POST(request: Request) {
  // Tracking returns a reporter-private timeline, so it gets the same
  // cross-origin guard as every other sensitive mutation. The failure is the
  // generic one: a rejected origin must not read differently from a wrong code.
  if (!isSameOriginRequest(request)) {
    return genericTrackingFailure();
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, 2048);
  } catch {
    return genericTrackingFailure();
  }

  try {
    const input = parseTrackingInput(body);
    await consumeTrackingRateLimits(request, input.trackingCode);

    const timeline = await findReporterTimeline(input);
    if (!timeline) {
      return genericTrackingFailure();
    }

    return NextResponse.json(
      { timeline },
      { headers: publicSensitiveResponseHeaders },
    );
  } catch (error) {
    if (error instanceof PublicRateLimitError) {
      return publicError(
        429,
        "TRACKING_NOT_FOUND",
        `Batas pelacakan tercapai. Coba lagi dalam ${Math.ceil(error.retryAfterSeconds / 60)} menit.`,
        null,
        error.retryAfterSeconds,
      );
    }

    if (error instanceof PublicInputError) {
      return genericTrackingFailure();
    }

    return genericTrackingFailure();
  }
}
