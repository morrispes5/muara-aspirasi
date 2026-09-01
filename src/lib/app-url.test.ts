import { afterEach, describe, expect, it } from "vitest";

import { absoluteUrl, getAppUrl, localAppUrlFallback } from "@/lib/app-url";

const original = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = original;
});

function withAppUrl(value: string | undefined) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = value;
}

describe("public app URL", () => {
  it("uses the configured origin", () => {
    withAppUrl("https://muara.example.ac.id");

    expect(getAppUrl()).toBe("https://muara.example.ac.id");
  });

  it("normalises to the origin, dropping any path or query", () => {
    withAppUrl("https://muara.example.ac.id/some/path?x=1");

    expect(getAppUrl()).toBe("https://muara.example.ac.id");
  });

  it.each([undefined, "", "   ", "not-a-url"])(
    "falls back to localhost for the unusable value %s",
    (value) => {
      withAppUrl(value);

      expect(getAppUrl()).toBe(localAppUrlFallback);
    },
  );

  /**
   * `new URL("javascript:alert(1)").origin` is the string "null", so before the
   * scheme allowlist `getAppUrl()` returned "null" and every consumer threw —
   * `new URL(path, "null")` is a TypeError, which would break sitemap.xml,
   * robots.txt, and the root layout through `metadataBase`. `ftp:` is the quiet
   * half: it parses, so an invalid scheme reached crawler-facing output.
   */
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://host/x",
    "vbscript:msgbox(1)",
    "null",
  ])("refuses the non-http(s) value %s", (value) => {
    withAppUrl(value);

    expect(getAppUrl()).toBe(localAppUrlFallback);
  });

  it("never returns the literal string 'null'", () => {
    for (const value of ["javascript:alert(1)", "data:,", "file:///x"]) {
      withAppUrl(value);

      expect(getAppUrl()).not.toBe("null");
    }
  });
});

describe("absolute URLs for crawler-facing routes", () => {
  it("builds a fully qualified sitemap URL", () => {
    withAppUrl("https://muara.example.ac.id");

    // robots.txt requires an absolute sitemap directive; a relative value is
    // ignored by crawlers, which is what this replaced.
    expect(absoluteUrl("/sitemap.xml")).toBe(
      "https://muara.example.ac.id/sitemap.xml",
    );
  });

  it("never returns a relative URL", () => {
    for (const configured of [undefined, "https://muara.example.ac.id"]) {
      withAppUrl(configured);

      for (const path of ["", "/", "/update", "/sitemap.xml"]) {
        expect(absoluteUrl(path)).toMatch(/^https?:\/\//);
      }
    }
  });

  it("never throws and never emits a non-http(s) scheme", () => {
    // absoluteUrl feeds robots.txt, sitemap.xml, and metadataBase, so it has to
    // be total: a bad env value must degrade, not crash the route.
    for (const configured of [
      undefined,
      "",
      "   ",
      "not-a-url",
      "null",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "ftp://host/x",
      "https://muara.example.ac.id",
    ]) {
      withAppUrl(configured);

      for (const path of ["/sitemap.xml", "/update", "/"]) {
        expect(() => absoluteUrl(path)).not.toThrow();
        expect(absoluteUrl(path)).toMatch(/^https?:\/\//);
      }
    }
  });

  it("keeps metadataBase constructible for any configured value", () => {
    for (const configured of ["javascript:alert(1)", "ftp://host", undefined]) {
      withAppUrl(configured);

      expect(() => new URL(getAppUrl())).not.toThrow();
    }
  });
});
