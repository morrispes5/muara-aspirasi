import {
  createHmac,
  scrypt as nodeScrypt,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const SCRYPT_COST = 16_384;
const SCRYPT_KEY_LENGTH = 32;
const TRACKING_CODE_PATTERN = /^MA-[A-Z0-9]{16}$/;

export const privacyNoticeVersion = "2026-08-30-m5";

export function normalizeTrackingCode(value: string) {
  return value.trim().toUpperCase();
}

export function isTrackingCode(value: string) {
  return TRACKING_CODE_PATTERN.test(value);
}

export function createTrackingCode() {
  return `MA-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function createTrackingSecret() {
  return randomBytes(32).toString("base64url");
}

export async function hashTrackingSecret(secret: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(secret, salt, SCRYPT_KEY_LENGTH)) as Buffer;

  return [
    "scrypt",
    SCRYPT_COST.toString(),
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyTrackingSecret(secret: string, storedHash: string) {
  const [algorithm, cost, encodedSalt, encodedKey] = storedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    cost !== SCRYPT_COST.toString() ||
    !encodedSalt ||
    !encodedKey
  ) {
    return false;
  }

  const expectedKey = Buffer.from(encodedKey, "base64url");
  const derivedKey = (await scrypt(
    secret,
    Buffer.from(encodedSalt, "base64url"),
    expectedKey.length,
  )) as Buffer;

  return (
    expectedKey.length === derivedKey.length &&
    timingSafeEqual(expectedKey, derivedKey)
  );
}

export function hashOpaqueValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
