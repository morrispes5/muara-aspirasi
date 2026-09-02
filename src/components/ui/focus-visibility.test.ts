import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * A source-level guard, not a rendering test. The repository has no DOM test
 * environment, and adding one is out of scope for this wave, so this asserts
 * the one thing checkable without a browser: that no component re-introduces a
 * utility which outranks the shared focus ring.
 *
 * Why specificity matters here. `globals.css` defines the only visible focus
 * indicator as a bare `:focus-visible` rule — specificity (0,1,0). Tailwind
 * compiles `focus:outline-none` to `.focus\:outline-none:focus` and
 * `focus-visible:outline-none` to `.focus-visible\:outline-none:focus-visible`,
 * both (0,2,0). Either one therefore wins and removes the ring outright,
 * regardless of source order.
 *
 * Plain `outline-none` is deliberately NOT flagged: it compiles to
 * `.outline-none` at (0,1,0), ties with `:focus-visible`, and loses on source
 * order because the shared rule is emitted later in the bundle. That was
 * verified against the built stylesheet, so those usages are left alone rather
 * than churned.
 */
const sourceRoot = fileURLToPath(new URL("../..", import.meta.url));

function componentSources(directory = ""): string[] {
  return readdirSync(`${sourceRoot}${directory}`, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return componentSources(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

const componentFiles = componentSources();

const ringBreakingUtilities = [
  "focus:outline-none",
  "focus-visible:outline-none",
];

/** Drops block and JSX comments so documentation of the rule is not read as a violation. */
function withoutComments(source: string): string {
  return source.replaceAll(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
}

describe("shared focus ring", () => {
  it("finds component sources to scan", () => {
    // Guards the guard: a broken walk would make every assertion below vacuous.
    expect(componentFiles.length).toBeGreaterThan(10);
    expect(componentFiles).toContain("components/public/article-card.tsx");
  });

  it("is defined once in the global stylesheet", () => {
    const globals = readFileSync(`${sourceRoot}app/globals.css`, "utf8");

    expect(globals).toMatch(/:focus-visible\s*\{[^}]*outline:/);
  });

  it.each(ringBreakingUtilities)(
    "is not cancelled by %s in any component",
    (utility) => {
      const offenders = componentFiles.filter((file) =>
        withoutComments(readFileSync(`${sourceRoot}${file}`, "utf8")).includes(
          utility,
        ),
      );

      expect(offenders).toEqual([]);
    },
  );

  it("still detects the utility when it is real code", () => {
    // Guards the comment stripping: prose about the rule must not be flagged,
    // but an actual className must be.
    expect(withoutComments("/* focus:outline-none */")).not.toContain(
      "focus:outline-none",
    );
    expect(withoutComments("{/* focus:outline-none */}")).not.toContain(
      "focus:outline-none",
    );
    expect(withoutComments('className="focus:outline-none"')).toContain(
      "focus:outline-none",
    );
  });
});
