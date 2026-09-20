import {
  formatTrackingReceipt,
  parseTrackingReceipt,
  type TrackingCredential,
} from "./tracking-receipt";

export const trackingBackupStorageName = "muara.private-receipts.v1";
const maxAge = 90 * 24 * 60 * 60 * 1000;
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Backup = { value: string; savedAt: number };

/** Explicit opt-in only. No identity, report contents, cookies or account keys. */
export function readTrackingBackups(
  storage: Store,
  now = Date.now(),
): Backup[] {
  const raw = storage.getItem(trackingBackupStorageName);
  if (!raw) return [];
  try {
    if (raw.length > 20000) throw new Error("Invalid backup");
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) throw new Error("Invalid backup");
    const valid = entries
      .filter(
        (entry): entry is Backup =>
          !!entry &&
          typeof entry.value === "string" &&
          !!parseTrackingReceipt(entry.value) &&
          typeof entry.savedAt === "number" &&
          entry.savedAt <= now &&
          entry.savedAt > now - maxAge,
      )
      .slice(0, 20);
    if (valid.length !== entries.length)
      storage.setItem(trackingBackupStorageName, JSON.stringify(valid));
    return valid;
  } catch {
    storage.removeItem(trackingBackupStorageName);
    return [];
  }
}

export function saveTrackingBackup(
  storage: Store,
  receipt: TrackingCredential,
  now = Date.now(),
) {
  const value = formatTrackingReceipt(receipt);
  if (!parseTrackingReceipt(value)) throw new Error("Bukti tidak valid.");
  const entries = readTrackingBackups(storage, now).filter(
    (entry) =>
      parseTrackingReceipt(entry.value)?.trackingCode !== receipt.trackingCode,
  );
  storage.setItem(
    trackingBackupStorageName,
    JSON.stringify([{ value, savedAt: now }, ...entries].slice(0, 20)),
  );
}

export function removeTrackingBackup(storage: Store, value: string) {
  const entries = readTrackingBackups(storage).filter(
    (entry) => entry.value !== value,
  );
  if (entries.length)
    storage.setItem(trackingBackupStorageName, JSON.stringify(entries));
  else storage.removeItem(trackingBackupStorageName);
}
