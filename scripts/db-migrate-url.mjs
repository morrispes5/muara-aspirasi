export function validateMigrationDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    return "DATABASE_URL_UNPOOLED belum diatur. Tambahkan hanya ke .env.local atau secret store sebelum menjalankan migrasi.";
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    return "DATABASE_URL_UNPOOLED bukan URL PostgreSQL yang valid.";
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    return "DATABASE_URL_UNPOOLED harus memakai skema postgres:// atau postgresql://.";
  }

  if (parsedUrl.hostname.includes("-pooler.")) {
    return "DATABASE_URL_UNPOOLED harus memakai endpoint direct; hostname -pooler tidak boleh dipakai untuk migrasi.";
  }

  return null;
}
