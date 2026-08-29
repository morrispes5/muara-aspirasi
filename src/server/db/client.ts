import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function getRuntimeDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL belum diatur. Tambahkan Neon pooled connection string hanya ke .env.local atau secret store.",
    );
  }

  return databaseUrl;
}

export function createDatabase(databaseUrl: string) {
  const client = new Pool({ connectionString: databaseUrl });

  return drizzle({ client });
}

export type Database = ReturnType<typeof createDatabase>;

export function getDatabase(): Database {
  return createDatabase(getRuntimeDatabaseUrl());
}
