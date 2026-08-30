import { NextResponse } from "next/server";

export const adminSensitiveResponseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

export function adminJson<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    headers: adminSensitiveResponseHeaders,
    status,
  });
}

export function adminError(status: number, code: string, message: string) {
  return adminJson(
    {
      error: { code, message },
    },
    status,
  );
}
