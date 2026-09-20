import { describe, expect, it } from "vitest";
import {
  formatTrackingReceipt,
  parseTrackingReceipt,
} from "./tracking-receipt";

describe("portable tracking receipt", () => {
  const credential = {
    trackingCode: "MA-0123456789ABCDEF",
    trackingSecret: "Ab_c-1".repeat(7) + "Z",
  };
  it("round-trips without changing the case-sensitive secret", () => {
    expect(
      parseTrackingReceipt(`\n${formatTrackingReceipt(credential)}\n`),
    ).toEqual(credential);
  });
  it.each([
    "",
    "MA-0123456789ABCDEF",
    "https://example.test/#secret",
    "MA-0123456789ABCDEF.short",
  ])("rejects incomplete receipts: %s", (value) => {
    expect(parseTrackingReceipt(value)).toBeNull();
  });
});
