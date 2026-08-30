import { NextResponse } from "next/server";

export const publicSensitiveResponseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export function publicError(
  status: number,
  code: string,
  message: string,
  field?: string | null,
) {
  return NextResponse.json(
    {
      error: {
        code,
        ...(field ? { field } : {}),
        message,
      },
    },
    { headers: publicSensitiveResponseHeaders, status },
  );
}
