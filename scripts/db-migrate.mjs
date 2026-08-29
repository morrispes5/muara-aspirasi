import { spawnSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL_UNPOOLED belum diatur. Tambahkan hanya ke .env.local atau secret store sebelum menjalankan migrasi.",
  );
  process.exitCode = 1;
} else {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/drizzle-kit/bin.cjs",
      "migrate",
      "--config=drizzle.config.ts",
      `--url=${databaseUrl}`,
    ],
    { stdio: "inherit" },
  );

  process.exitCode = result.status ?? 1;
}
