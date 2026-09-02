import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  isNonProductionEnvironment,
  nonProductionMarker,
  resolveDeployEnvironment,
} from "@/server/config/deploy-environment";

/**
 * Netlify's secret scanner matches the *values* of configured environment
 * variables against the repository and the build output. Setting
 * `DATABASE_ENVIRONMENT` to a dictionary word made every occurrence of that word
 * in README, docs, tests, and source a "match", which failed deploy
 * `6a96d0f38086ad0008e5660f`. The marker is an alias that occurs nowhere in the
 * tree, so the scanner stays fully enabled and no documentation had to be
 * redacted to hide a match.
 */
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
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

function sourceFiles(directory: string): string[] {
  return readdirSync(`${repoRoot}${directory}`, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return scannedExtensions.some((extension) => entry.name.endsWith(extension))
      ? [path]
      : [];
  });
}

describe("deploy environment resolution", () => {
  it.each([
    ["development", "development"],
    ["preview", "preview"],
    ["production", "production"],
  ] as const)("keeps the canonical value %s", (value, expected) => {
    expect(resolveDeployEnvironment(value)).toBe(expected);
  });

  it("maps the Netlify-only marker to preview", () => {
    expect(resolveDeployEnvironment(nonProductionMarker)).toBe("preview");
    expect(isNonProductionEnvironment(nonProductionMarker)).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(resolveDeployEnvironment(`  ${nonProductionMarker}  `)).toBe(
      "preview",
    );
    expect(resolveDeployEnvironment("  production  ")).toBe("production");
  });

  it.each([undefined, "", "   ", "staging", "prod", "PRODUCTION", "Preview"])(
    "refuses the unusable value %s rather than defaulting",
    (value) => {
      // Fail-closed both ways: an unknown value must not become production, and
      // must not hand out the seed, bootstrap, or Turnstile allowances either.
      expect(resolveDeployEnvironment(value)).toBeNull();
      expect(isNonProductionEnvironment(value)).toBe(false);
    },
  );

  it("never treats the marker as production", () => {
    expect(resolveDeployEnvironment(nonProductionMarker)).not.toBe(
      "production",
    );
  });

  it("does not treat production as non-production", () => {
    expect(isNonProductionEnvironment("production")).toBe(false);
  });
});

describe("marker is scanner-safe", () => {
  it("appears in no tracked source file", () => {
    const files = scannedDirectories.flatMap((directory) =>
      sourceFiles(directory),
    );
    // Guards the guard: an empty sweep would make this vacuous.
    expect(files.length).toBeGreaterThan(30);

    const offenders = files.filter((file) =>
      readFileSync(`${repoRoot}${file}`, "utf8").includes(nonProductionMarker),
    );

    expect(offenders).toEqual([]);
  });

  it("is distinctive enough not to collide with ordinary prose", () => {
    // The whole point is that it is not a dictionary word.
    expect(nonProductionMarker).not.toMatch(
      /^(development|preview|production)$/,
    );
    expect(nonProductionMarker.length).toBeGreaterThan(10);
  });
});
