import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "src/server/auth/user-management.integration.test.ts",
  ],
  {
    env: {
      ...process.env,
      AUTH_INTEGRATION: "1",
    },
    stdio: "inherit",
  },
);

process.exitCode = result.status ?? 1;
