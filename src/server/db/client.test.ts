import { afterEach, describe, expect, it } from "vitest";

import {
  DatabaseConfigurationError,
  getRuntimeDatabaseUrl,
} from "@/server/db/client";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("getRuntimeDatabaseUrl", () => {
  it("menolak runtime tanpa DATABASE_URL daripada memakai fallback yang tidak aman", () => {
    delete process.env.DATABASE_URL;

    expect(() => getRuntimeDatabaseUrl()).toThrow(DatabaseConfigurationError);
  });

  it("mengembalikan pooled URL yang diberikan secret store", () => {
    process.env.DATABASE_URL = "postgresql://runtime-placeholder";

    expect(getRuntimeDatabaseUrl()).toBe("postgresql://runtime-placeholder");
  });
});
