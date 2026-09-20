import { describe, expect, it } from "vitest";
import {
  readTrackingBackups,
  removeTrackingBackup,
  saveTrackingBackup,
  trackingBackupKey,
} from "./tracking-backup";
const receipt = {
  trackingCode: "MA-0123456789ABCDEF",
  trackingSecret: "x".repeat(43),
};
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
describe("opt-in tracking backup", () => {
  it("stores nothing until explicit save and deduplicates receipts", () => {
    const store = storage();
    expect(readTrackingBackups(store)).toEqual([]);
    expect(store.getItem(trackingBackupKey)).toBeNull();
    saveTrackingBackup(store, receipt);
    saveTrackingBackup(store, receipt);
    expect(readTrackingBackups(store)).toHaveLength(1);
    const text = store.getItem(trackingBackupKey)!;
    expect(text).not.toContain("name");
    expect(text).not.toContain("email");
  });
  it("expires and removes invalid backups", () => {
    const store = storage();
    saveTrackingBackup(store, receipt, 1000);
    expect(readTrackingBackups(store, 1000 + 91 * 86400000)).toEqual([]);
    store.setItem(trackingBackupKey, "not json");
    expect(readTrackingBackups(store)).toEqual([]);
    expect(store.getItem(trackingBackupKey)).toBeNull();
  });
  it("rejects malformed credentials and allows removing one local copy", () => {
    const store = storage();
    expect(() =>
      saveTrackingBackup(store, { ...receipt, trackingSecret: "bad" }),
    ).toThrow();
    saveTrackingBackup(store, receipt);
    removeTrackingBackup(store, readTrackingBackups(store)[0].value);
    expect(readTrackingBackups(store)).toEqual([]);
  });
});
