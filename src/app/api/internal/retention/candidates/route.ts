import { timingSafeEqual } from "node:crypto";

import { enqueueRetentionCandidates } from "@/server/privacy/retention";

export const runtime = "nodejs";

function authorized(request: Request) {
  const expected = process.env.RETENTION_REVIEW_JOB_SECRET?.trim();
  const received = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await enqueueRetentionCandidates();
  return Response.json({
    enqueued: result.enqueued,
    evaluatedAt: result.evaluatedAt.toISOString(),
  });
}
