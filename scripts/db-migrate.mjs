import { spawnSync } from "node:child_process";

import { validateMigrationDatabaseUrl } from "./db-migrate-url.mjs";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const validationError = validateMigrationDatabaseUrl(databaseUrl);

if (validationError) {
  console.error(validationError);
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/drizzle-kit/bin.cjs",
      "migrate",
      "--config=drizzle.config.ts",
    ],
    { stdio: "inherit" },
  );

  process.exitCode = result.status ?? 1;
}
