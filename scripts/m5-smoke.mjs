import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const environment = process.env.DATABASE_ENVIRONMENT;
const baseUrl = process.env.M5_SMOKE_BASE_URL ?? "http://localhost:3000";

if (!databaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED harus tersedia untuk smoke test M5.");
}

if (environment !== "development" && environment !== "preview") {
  throw new Error(
    "Smoke test M5 hanya boleh berjalan pada development atau preview.",
  );
}

const sql = neon(databaseUrl);
const [category] = await sql`
  select id
  from categories
  where is_active = true
  order by sort_order asc
  limit 1
`;

if (!category) {
  throw new Error("Tidak ada kategori aktif untuk smoke test M5.");
}

const marker = randomUUID();
const idempotencyKey = randomUUID();
const requestHeaders = {
  "content-type": "application/json",
  "idempotency-key": idempotencyKey,
  origin: baseUrl,
  "x-nf-client-connection-ip": `m5-${marker}`,
};
const payload = {
  categoryId: category.id,
  chronology: `Smoke-test chronology ${marker}`,
  contactAllowed: false,
  email: null,
  ethicsAccepted: true,
  honeypot: "",
  identityMode: "CONFIDENTIAL_BEM_ONLY",
  impact: "Smoke-test impact only.",
  limitedShareConsent: false,
  location: "M5 test location",
  name: "M5 Synthetic Reporter",
  nim: "M5-00000001",
  suggestedSolution: null,
  title: `M5 smoke ${marker}`,
  turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
  whatsapp: null,
};

let reportId = null;

try {
  const submission = await fetch(`${baseUrl}/api/aspirasi`, {
    body: JSON.stringify(payload),
    headers: requestHeaders,
    method: "POST",
  });
  const submissionBody = await submission.json();

  if (
    submission.status !== 201 ||
    !submissionBody?.receipt?.trackingCode ||
    !submissionBody?.receipt?.trackingSecret ||
    submission.headers.get("cache-control") !== "no-store, max-age=0" ||
    submission.headers.get("referrer-policy") !== "no-referrer"
  ) {
    throw new Error(
      `Submission M5 tidak memenuhi kontrak receipt/no-store: ${JSON.stringify({
        errorCode: submissionBody?.error?.code ?? null,
        hasReceipt: Boolean(submissionBody?.receipt),
        referrerPolicy: submission.headers.get("referrer-policy"),
        status: submission.status,
        cacheControl: submission.headers.get("cache-control"),
      })}`,
    );
  }

  const { trackingCode, trackingSecret } = submissionBody.receipt;
  const [report] = await sql`
    select id, tracking_secret_hash, submission_key_hash, status
    from aspiration_reports
    where tracking_code = ${trackingCode}
    limit 1
  `;
  reportId = report?.id ?? null;

  const duplicate = await fetch(`${baseUrl}/api/aspirasi`, {
    body: JSON.stringify(payload),
    headers: requestHeaders,
    method: "POST",
  });
  const duplicateBody = await duplicate.json();

  if (
    duplicate.status !== 409 ||
    duplicateBody?.error?.code !== "SUBMISSION_ALREADY_RECEIVED"
  ) {
    throw new Error("Idempotency M5 tidak mencegah duplikasi report.");
  }

  const badTracking = await fetch(`${baseUrl}/api/aspirasi/lacak`, {
    body: JSON.stringify({
      trackingCode,
      trackingSecret: "wrong-token-for-m5-smoke",
    }),
    headers: {
      "content-type": "application/json",
      "x-nf-client-connection-ip": `m5-${marker}`,
    },
    method: "POST",
  });
  const badTrackingBody = await badTracking.json();
  if (
    badTracking.status !== 404 ||
    badTrackingBody?.error?.code !== "TRACKING_NOT_FOUND"
  ) {
    throw new Error("Tracking gagal tidak bersifat generik.");
  }

  const tracking = await fetch(`${baseUrl}/api/aspirasi/lacak`, {
    body: JSON.stringify({ trackingCode, trackingSecret }),
    headers: {
      "content-type": "application/json",
      "x-nf-client-connection-ip": `m5-${marker}`,
    },
    method: "POST",
  });
  const trackingBody = await tracking.json();
  const serializedTimeline = JSON.stringify(trackingBody);

  if (
    tracking.status !== 200 ||
    trackingBody?.timeline?.status !== "RECEIVED" ||
    !trackingBody?.timeline?.events?.[0]?.message ||
    serializedTimeline.includes(payload.name) ||
    serializedTimeline.includes(payload.nim) ||
    serializedTimeline.includes(payload.title) ||
    serializedTimeline.includes(payload.chronology)
  ) {
    throw new Error(
      "Projection tracking M5 membocorkan field privat atau tidak lengkap.",
    );
  }

  const [event] = await sql`
    select id
    from report_status_events
    where report_id = ${reportId}
      and to_status = 'RECEIVED'
      and is_reporter_visible = true
    limit 1
  `;
  const [audit] = await sql`
    select id
    from audit_events
    where target_id = ${reportId}
      and action = 'PUBLIC_REPORT_SUBMITTED'
      and actor_type = 'PUBLIC'
      and result = 'SUCCESS'
    limit 1
  `;

  if (
    !reportId ||
    report.status !== "RECEIVED" ||
    !report.submission_key_hash ||
    report.tracking_secret_hash === trackingSecret ||
    report.tracking_secret_hash.includes(trackingSecret) ||
    !event ||
    !audit
  ) {
    throw new Error("Persistence M5 tidak memenuhi hash/event/audit contract.");
  }

  console.log(
    JSON.stringify({
      environment,
      idempotency: "passed",
      submission: "passed",
      trackingPrivacy: "passed",
    }),
  );
} finally {
  if (reportId) {
    await sql`delete from audit_events where target_id = ${reportId}`;
    await sql`delete from report_status_events where report_id = ${reportId}`;
    await sql`delete from reporter_identities where report_id = ${reportId}`;
    await sql`delete from aspiration_reports where id = ${reportId}`;
  }
}
