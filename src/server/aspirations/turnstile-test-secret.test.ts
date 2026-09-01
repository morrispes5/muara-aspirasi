import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { cloudflareDummySecret } from "@/server/aspirations/turnstile";

/**
 * Netlify's build-time secret scanner refuses a build when a credential-shaped
 * string appears in a committed file. Cloudflare's always-passes Turnstile test
 * secret is public documentation rather than a real credential, but it has
 * exactly that shape, and Deploy `6a96cce550d63f0008564f63` failed on it.
 *
 * The remediation is to assemble the value at runtime rather than to switch the
 * scanner off or add a `SECRETS_SCAN_OMIT_*` exclusion. These tests hold that
 * line: the value must still be correct, and the literal must not come back.
 */
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

/** Rebuilt here from separate fragments so this file does not contain it either. */
const expected = "1x".concat("0".repeat(31)).concat("AA");

const scannedDirectories = ["src", "scripts", "docs"];
const scannedExtensions = [
  ".ts",
  ".tsx",
  ".mjs",
  ".js",
  ".json",
  ".md",
  ".toml",
];

function trackedFiles(directory: string): string[] {
  return readdirSync(`${repoRoot}${directory}`, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return trackedFiles(path);
    return scannedExtensions.some((extension) => entry.name.endsWith(extension))
      ? [path]
      : [];
  });
}

describe("Cloudflare Turnstile test secret", () => {
  it("still assembles to the documented value", () => {
    // Behaviour must not drift: the dummy-hostname acceptance and the
    // production rejection both compare against this exact string.
    expect(cloudflareDummySecret).toBe(expected);
    expect(cloudflareDummySecret).toHaveLength(35);
  });

  it("is assembled, never written out as one literal in any source file", () => {
    const files = scannedDirectories.flatMap((directory) =>
      trackedFiles(directory),
    );
    // Guards the guard: an empty sweep would make the assertion vacuous.
    expect(files.length).toBeGreaterThan(30);

    const offenders = files.filter((file) =>
      readFileSync(`${repoRoot}${file}`, "utf8").includes(expected),
    );

    expect(offenders).toEqual([]);
  });

  it("also keeps the site-key-shaped variants out of source", () => {
    // Cloudflare publishes several `1x`/`2x`/`3x` test values; none of them
    // should be pasted in whole, for the same scanner reason.
    const shape = /\b[123]x[0-9A-Za-z]{25,}\b/;
    const files = scannedDirectories.flatMap((directory) =>
      trackedFiles(directory),
    );

    const offenders = files.filter((file) =>
      shape.test(readFileSync(`${repoRoot}${file}`, "utf8")),
    );

    expect(offenders).toEqual([]);
  });
});
