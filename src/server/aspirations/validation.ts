import {
  isTrackingCode,
  normalizeTrackingCode,
} from "@/server/aspirations/tracking";
import {
  reportFieldDefinitions,
  reportFieldError,
  type ReportFields,
} from "@/lib/report-fields";

export const identityModes = [
  "CONFIDENTIAL_BEM_ONLY",
  "CONSENTED_LIMITED_SHARE",
] as const;

export type IdentityMode = (typeof identityModes)[number];

export type EvidenceIntentInput = {
  intentId: string;
};

export type SubmissionInput = {
  categoryId: string;
  chronology: string;
  contactAllowed: boolean;
  evidence: EvidenceIntentInput[];
  email: string | null;
  ethicsAccepted: true;
  honeypot: string;
  identityMode: IdentityMode;
  impact: string;
  limitedShareConsent: boolean;
  location: string;
  name: string;
  nim: string;
  suggestedSolution: string | null;
  title: string;
  turnstileToken: string;
  whatsapp: string | null;
};

export class PublicInputError extends Error {
  constructor(
    public readonly field: string | null,
    message: string,
  ) {
    super(message);
    this.name = "PublicInputError";
  }
}

const submissionKeys = new Set<keyof SubmissionInput>([
  "categoryId",
  "chronology",
  "contactAllowed",
  "evidence",
  "email",
  "ethicsAccepted",
  "honeypot",
  "identityMode",
  "impact",
  "limitedShareConsent",
  "location",
  "name",
  "nim",
  "suggestedSolution",
  "title",
  "turnstileToken",
  "whatsapp",
]);

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PublicInputError(null, "Format permintaan tidak dapat diproses.");
  }

  return value as Record<string, unknown>;
}

function compactText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new PublicInputError(field, "Kolom ini wajib diisi.");
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    throw new PublicInputError(field, "Kolom ini wajib diisi.");
  }

  if (normalized.length > maxLength) {
    throw new PublicInputError(field, `Maksimum ${maxLength} karakter.`);
  }

  return normalized;
}

export function parseReportFields(value: unknown): ReportFields {
  const source = object(value);
  const fields = {} as ReportFields;
  for (const field of reportFieldDefinitions) {
    const text = compactText(source[field.key], field.key, field.max);
    const error = reportFieldError(field.key, text);
    if (error) throw new PublicInputError(field.key, error);
    fields[field.key] = field.key === "email" ? text.toLowerCase() : text;
  }
  return fields;
}

function booleanValue(value: unknown, field: string) {
  if (typeof value !== "boolean") {
    throw new PublicInputError(field, "Nilai pilihan tidak valid.");
  }

  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function parseSubmissionInput(value: unknown): SubmissionInput {
  const source = object(value);

  for (const key of Object.keys(source)) {
    if (!submissionKeys.has(key as keyof SubmissionInput)) {
      throw new PublicInputError(
        null,
        "Format permintaan tidak dapat diproses.",
      );
    }
  }

  const categoryId = compactText(source.categoryId, "categoryId", 36);

  if (!isUuid(categoryId)) {
    throw new PublicInputError("categoryId", "Pilih kategori aspirasi.");
  }

  const evidenceValue = source.evidence;
  const evidence: EvidenceIntentInput[] = [];
  if (evidenceValue !== undefined) {
    if (!Array.isArray(evidenceValue) || evidenceValue.length > 3) {
      throw new PublicInputError(
        "evidence",
        "Evidence maksimal terdiri dari tiga file.",
      );
    }

    for (const item of evidenceValue) {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        Object.keys(item).length !== 1 ||
        typeof (item as { intentId?: unknown }).intentId !== "string" ||
        !isUuid((item as { intentId: string }).intentId)
      ) {
        throw new PublicInputError("evidence", "Handle evidence tidak valid.");
      }

      evidence.push({ intentId: (item as { intentId: string }).intentId });
    }
  }

  const fields = parseReportFields(source);
  const { name, nim, email, whatsapp } = fields;

  const identityMode = source.identityMode as IdentityMode;
  if (!identityModes.includes(identityMode)) {
    throw new PublicInputError("identityMode", "Pilihan privasi tidak valid.");
  }

  const limitedShareConsent = booleanValue(
    source.limitedShareConsent,
    "limitedShareConsent",
  );

  if (identityMode === "CONSENTED_LIMITED_SHARE" && !limitedShareConsent) {
    throw new PublicInputError(
      "limitedShareConsent",
      "Persetujuan eksplisit diperlukan untuk berbagi terbatas.",
    );
  }

  if (source.ethicsAccepted !== true) {
    throw new PublicInputError(
      "ethicsAccepted",
      "Setujui etika pelaporan sebelum mengirim.",
    );
  }

  if (typeof source.honeypot !== "string") {
    throw new PublicInputError(null, "Format permintaan tidak dapat diproses.");
  }

  const honeypot = source.honeypot;
  const turnstileToken = compactText(
    source.turnstileToken,
    "turnstileToken",
    2048,
  );

  const contactAllowed = booleanValue(source.contactAllowed, "contactAllowed");
  if (contactAllowed && !email && !whatsapp) {
    throw new PublicInputError(
      "contactAllowed",
      "Isi email atau WhatsApp jika BEM boleh menghubungi kamu.",
    );
  }

  return {
    categoryId,
    chronology: compactText(source.chronology, "chronology", 5000),
    contactAllowed,
    evidence,
    email,
    ethicsAccepted: true,
    honeypot,
    identityMode,
    impact: compactText(source.impact, "impact", 3000),
    limitedShareConsent,
    location: compactText(source.location, "location", 200),
    name,
    nim,
    suggestedSolution: fields.suggestedSolution,
    title: compactText(source.title, "title", 200),
    turnstileToken,
    whatsapp,
  };
}

export type TrackingInput = {
  trackingCode: string;
  trackingSecret: string;
};

export function parseTrackingInput(value: unknown): TrackingInput {
  const source = object(value);
  const keys = Object.keys(source);

  if (
    keys.length !== 2 ||
    !keys.includes("trackingCode") ||
    !keys.includes("trackingSecret")
  ) {
    throw new PublicInputError(null, "Permintaan tidak dapat diproses.");
  }

  const trackingCode = normalizeTrackingCode(
    compactText(source.trackingCode, "trackingCode", 32),
  );
  const trackingSecret = compactText(
    source.trackingSecret,
    "trackingSecret",
    128,
  );

  if (!isTrackingCode(trackingCode)) {
    throw new PublicInputError(
      "trackingCode",
      "Permintaan tidak dapat diproses.",
    );
  }

  return { trackingCode, trackingSecret };
}
