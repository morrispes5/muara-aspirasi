import { describe, expect, it } from "vitest";

import { validateMigrationDatabaseUrl } from "./db-migrate-url.mjs";

describe("validateMigrationDatabaseUrl", () => {
  it("menerima endpoint PostgreSQL direct", () => {
    expect(
      validateMigrationDatabaseUrl(
        "postgresql://user:password@ep-preview.example.neon.tech/neondb?sslmode=require",
      ),
    ).toBeNull();
  });

  it("menolak endpoint pooler untuk migration", () => {
    expect(
      validateMigrationDatabaseUrl(
        "postgresql://user:password@ep-preview-pooler.example.neon.tech/neondb?sslmode=require",
      ),
    ).toContain("endpoint direct");
  });

  it.each([undefined, "", "not-a-url", "https://example.com/database"])(
    "menolak konfigurasi migration yang tidak aman: %s",
    (databaseUrl) => {
      expect(validateMigrationDatabaseUrl(databaseUrl)).not.toBeNull();
    },
  );
});
