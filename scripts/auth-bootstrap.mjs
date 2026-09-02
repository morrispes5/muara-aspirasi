import { isNonProductionEnvironment } from "./deploy-environment.mjs";
import { randomUUID } from "node:crypto";

import { createLocalAccountIssuer } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const environment = process.env.DATABASE_ENVIRONMENT;
const name = process.env.AUTH_BOOTSTRAP_NAME?.trim();
const email = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.AUTH_BOOTSTRAP_PASSWORD;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED belum diatur. Bootstrap hanya berjalan dari .env.local atau secret store.",
  );
}

if (!isNonProductionEnvironment(environment)) {
  throw new Error(
    "DATABASE_ENVIRONMENT harus development atau preview untuk bootstrap aman non-production.",
  );
}

if (!name || name.length < 2 || name.length > 160) {
  throw new Error("AUTH_BOOTSTRAP_NAME wajib diisi dan maksimal 160 karakter.");
}

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  throw new Error("AUTH_BOOTSTRAP_EMAIL harus berupa email yang valid.");
}

if (!password || password.length < 12 || password.length > 128) {
  throw new Error(
    "AUTH_BOOTSTRAP_PASSWORD wajib memiliki panjang 12 sampai 128 karakter.",
  );
}

const allowedDomains = (process.env.BEM_ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

if (
  allowedDomains.length > 0 &&
  !allowedDomains.some((domain) => email.endsWith(`@${domain}`))
) {
  throw new Error("Email bootstrap tidak termasuk domain BEM yang diizinkan.");
}

const userId = randomUUID();
const passwordHash = await hashPassword(password);
const credentialIssuer = createLocalAccountIssuer("credential");
const pool = new Pool({ connectionString: databaseUrl });

try {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      "select id from bem_users where email = $1 limit 1",
      [email],
    );

    if (existingUser.rows.length > 0) {
      throw new Error("Akun dengan email tersebut sudah ada.");
    }

    await client.query(
      `insert into bem_users
        (id, name, email, email_verified, role, status)
       values ($1, $2, $3, true, 'ADMIN', 'ACTIVE')`,
      [userId, name, email],
    );

    await client.query(
      `insert into auth_accounts
        (id, user_id, issuer, account_id, provider_id, password)
       values ($1, $2, $3, $4, 'credential', $5)`,
      [randomUUID(), userId, credentialIssuer, userId, passwordHash],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

console.log(
  "Bootstrap akun ADMIN berhasil. Hapus nilai bootstrap dari .env.local.",
);
