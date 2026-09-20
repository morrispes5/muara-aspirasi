import { describe, expect, it } from "vitest";
import { readBoundedJson, RequestBodyTooLargeError } from "./request-body";

describe("bounded JSON bodies", () => {
  it("rejects oversized data even with a forged small Content-Length", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "1" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    await expect(readBoundedJson(request, 32)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
  it("parses an ordinary request", async () => {
    await expect(
      readBoundedJson(
        new Request("https://example.test", {
          method: "POST",
          body: '{"ok":true}',
        }),
      ),
    ).resolves.toEqual({ ok: true });
  });
});
