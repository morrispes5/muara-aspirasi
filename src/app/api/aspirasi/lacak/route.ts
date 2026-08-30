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
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const genericTrackingFailure = () =>
  publicError(
    404,
    "TRACKING_NOT_FOUND",
    "Kode atau token rahasia tidak cocok. Periksa kembali keduanya.",
  );

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
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
        "Tunggu beberapa saat sebelum mencoba lagi.",
      );
    }

    if (error instanceof PublicInputError) {
      return genericTrackingFailure();
    }

    return genericTrackingFailure();
  }
}
