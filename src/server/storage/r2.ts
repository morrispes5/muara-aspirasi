import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { isPlaceholderSecret } from "@/server/config/secret-policy";

export const R2_UPLOAD_EXPIRY_SECONDS = 10 * 60;
export const R2_DOWNLOAD_EXPIRY_SECONDS = 60;

export class R2ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2ConfigurationError";
  }
}

export class R2StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2StorageError";
  }
}

type R2Config = {
  accessKeyId: string;
  accountId: string;
  bucket: string;
  secretAccessKey: string;
};

function requiredValue(variableName: keyof R2Config): string {
  const environmentName = {
    accessKeyId: "R2_ACCESS_KEY_ID",
    accountId: "R2_ACCOUNT_ID",
    bucket: "R2_EVIDENCE_BUCKET",
    secretAccessKey: "R2_SECRET_ACCESS_KEY",
  }[variableName];
  const value = process.env[environmentName]?.trim();

  if (
    !value ||
    (variableName === "secretAccessKey" && isPlaceholderSecret(value))
  ) {
    throw new R2ConfigurationError(
      `${environmentName} belum dikonfigurasi untuk evidence privat.`,
    );
  }

  return value;
}

function getConfig(): R2Config {
  return {
    accessKeyId: requiredValue("accessKeyId"),
    accountId: requiredValue("accountId"),
    bucket: requiredValue("bucket"),
    secretAccessKey: requiredValue("secretAccessKey"),
  };
}

function getClient(config: R2Config) {
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  });
}

function assertEvidenceObjectKey(objectKey: string) {
  if (!/^evidence\/quarantine\/[0-9a-f-]{36}$/i.test(objectKey)) {
    throw new R2StorageError("Evidence object key tidak valid.");
  }
}

export function isR2EvidenceEnabled() {
  return process.env.R2_EVIDENCE_ENABLED?.trim().toLowerCase() === "true";
}

export function createEvidenceObjectKey() {
  const id = randomUUID();
  return `evidence/quarantine/${id}`;
}

export async function createEvidenceUploadUrl(input: {
  mimeType: string;
  objectKey: string;
}) {
  assertEvidenceObjectKey(input.objectKey);
  const config = getConfig();
  const client = getClient(config);

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      ContentType: input.mimeType,
      Key: input.objectKey,
    }),
    { expiresIn: R2_UPLOAD_EXPIRY_SECONDS },
  );
}

export async function inspectEvidenceObject(objectKey: string) {
  assertEvidenceObjectKey(objectKey);
  const config = getConfig();
  const client = getClient(config);

  try {
    const result = await client.send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    );

    return {
      contentLength: result.ContentLength ?? null,
      contentType: result.ContentType ?? null,
    };
  } catch {
    throw new R2StorageError("Evidence belum tersedia di penyimpanan privat.");
  }
}

export async function readEvidenceObject(objectKey: string) {
  assertEvidenceObjectKey(objectKey);
  const config = getConfig();
  const client = getClient(config);

  try {
    const result = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    );

    if (!result.Body) {
      throw new R2StorageError("Evidence tidak memiliki isi.");
    }

    const bytes = Buffer.from(await result.Body.transformToByteArray());

    return {
      bytes,
      contentLength: result.ContentLength ?? bytes.length,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    if (error instanceof R2StorageError) {
      throw error;
    }

    throw new R2StorageError("Evidence belum dapat dibaca dari penyimpanan.");
  }
}

export async function createEvidenceDownloadUrl(objectKey: string) {
  assertEvidenceObjectKey(objectKey);
  const config = getConfig();
  const client = getClient(config);

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ResponseContentDisposition: "attachment",
    }),
    { expiresIn: R2_DOWNLOAD_EXPIRY_SECONDS },
  );
}

export async function deleteEvidenceObject(objectKey: string) {
  assertEvidenceObjectKey(objectKey);
  const config = getConfig();
  const client = getClient(config);

  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }),
  );
}
