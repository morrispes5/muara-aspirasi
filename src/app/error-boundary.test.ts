import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The route error boundary receives the thrown `Error` plus a Next.js `digest`.
 * `docs/SECURITY_PRIVACY.md` section 8 requires that a public error expose no
 * stack trace, query, or provider response, and `error.message` can carry a
 * connection string, a failing statement, or a vendor payload.
 *
 * This is a source-level guard rather than a render test: the repository has no
 * DOM test environment. It catches the realistic regression — someone adding
 * `{error.message}` while debugging and leaving it in.
 */
const errorBoundary = readFileSync(
  fileURLToPath(new URL("./error.tsx", import.meta.url)),
  "utf8",
);

/** Drops comments so the file's own explanation of the rule is not read as a violation. */
const executableSource = errorBoundary.replaceAll(
  /\{?\/\*[\s\S]*?\*\/\}?/g,
  "",
);

describe("route error boundary", () => {
  it("reads the boundary source", () => {
    // Guards the guard: a wrong path would make the assertions below vacuous.
    expect(executableSource).toContain("export default function");
    expect(executableSource).toContain("reset");
  });

  it("never renders the thrown error or its digest", () => {
    for (const leak of [
      "error.message",
      "error.stack",
      "error.digest",
      "{error}",
      "String(error)",
      "JSON.stringify(error",
    ]) {
      expect(executableSource).not.toContain(leak);
    }
  });

  it("offers a retry and stays a client component", () => {
    expect(errorBoundary).toContain('"use client"');
    expect(executableSource).toContain("onClick={reset}");
  });
});
