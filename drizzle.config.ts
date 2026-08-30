import { defineConfig } from "drizzle-kit";

const migrationDatabaseUrl = process.env.DATABASE_URL_UNPOOLED;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  ...(migrationDatabaseUrl
    ? {
        dbCredentials: {
          url: migrationDatabaseUrl,
        },
      }
    : {}),
});
