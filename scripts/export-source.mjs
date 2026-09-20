import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, "dist", "muara-aspirasi-source.zip");
mkdirSync(resolve(root, "dist"), { recursive: true });
// Explicit entry points exclude local files and history. HEAD attributes omit
// institutional assets. Nothing is automatically published.
execFileSync(
  "git",
  [
    "archive",
    "--format=zip",
    `--output=${output}`,
    "HEAD",
    "src",
    "scripts",
    "drizzle",
    "public",
    "tests",
    ".github",
    ".gitattributes",
    ".gitignore",
    ".env.example",
    ".nvmrc",
    "README.md",
    "SOURCE_NOTICE.md",
    ".prettierrc.json",
    ".prettierignore",
    ".editorconfig",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next-env.d.ts",
    "next.config.ts",
    "netlify.toml",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "playwright.config.ts",
    "vitest.config.ts",
    "drizzle.config.ts",
  ],
  { cwd: root, stdio: "inherit" },
);
console.log(`Source archive: ${output}`);
console.log(
  "HEAD only. No Git history, original images, operational docs or local environment files. Review before publishing; git clone is not restricted by this export policy.",
);
