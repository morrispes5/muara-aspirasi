const baseUrl = (
  process.env.AUTH_SMOKE_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const email = process.env.AUTH_BOOTSTRAP_EMAIL;
const password = process.env.AUTH_BOOTSTRAP_PASSWORD;

if (!email || !password) {
  throw new Error(
    "AUTH_BOOTSTRAP_EMAIL dan AUTH_BOOTSTRAP_PASSWORD wajib untuk auth smoke test.",
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readBody(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function post(path, body, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: options.origin ?? baseUrl,
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    method: "POST",
    redirect: "manual",
  });
}

function sessionCookieFrom(response) {
  const setCookies = response.headers.getSetCookie();
  const sessionCookie = setCookies.find((value) =>
    value.toLowerCase().includes(".session_token="),
  );

  assert(sessionCookie, "Respons login tidak menerbitkan cookie sesi.");

  return {
    attributes: sessionCookie,
    header: sessionCookie.split(";", 1)[0],
  };
}

async function getSession(cookie) {
  const response = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { cookie },
  });
  const body = await readBody(response);

  assert(
    response.ok,
    `Pemeriksaan sesi gagal dengan status ${response.status}.`,
  );
  return body;
}

const unauthenticatedAdmin = await fetch(`${baseUrl}/admin`, {
  redirect: "manual",
});
assert(
  [302, 307, 308].includes(unauthenticatedAdmin.status) &&
    (unauthenticatedAdmin.headers.get("location") ?? "").includes(
      "/admin/login",
    ),
  "Area admin tidak mengalihkan pengunjung tanpa sesi ke halaman login.",
);

const signUp = await post("/api/auth/sign-up/email", {
  email: `blocked-${Date.now()}@example.invalid`,
  name: "Blocked Signup",
  password: "BlockedSignup!2026",
});
assert(signUp.status === 400, "Pendaftaran publik seharusnya ditolak.");

const untrustedOrigin = await post(
  "/api/auth/sign-in/email",
  { email, password },
  { origin: "https://evil.example.invalid" },
);
assert(
  [400, 403].includes(untrustedOrigin.status),
  "Permintaan login dari origin tidak tepercaya seharusnya ditolak.",
);

const firstLogin = await post("/api/auth/sign-in/email", { email, password });
assert(
  firstLogin.ok,
  `Login sesi pertama gagal dengan status ${firstLogin.status}.`,
);
const firstCookie = sessionCookieFrom(firstLogin);
const firstCookieAttributes = firstCookie.attributes.toLowerCase();
assert(
  firstCookieAttributes.includes("httponly"),
  "Cookie sesi harus HttpOnly.",
);
assert(
  firstCookieAttributes.includes("samesite=lax"),
  "Cookie sesi harus menggunakan SameSite=Lax.",
);
assert(
  !firstCookieAttributes.includes("; secure"),
  "Cookie lokal HTTP tidak boleh diberi atribut Secure.",
);

const firstSession = await getSession(firstCookie.header);
assert(firstSession?.user?.email === email, "Sesi pertama tidak dapat dibaca.");

const secondLogin = await post("/api/auth/sign-in/email", { email, password });
assert(
  secondLogin.ok,
  `Login sesi kedua gagal dengan status ${secondLogin.status}.`,
);
const secondCookie = sessionCookieFrom(secondLogin);

const revokeOthers = await post(
  "/api/auth/revoke-other-sessions",
  {},
  { cookie: secondCookie.header },
);
assert(revokeOthers.ok, "Pencabutan sesi lain gagal.");

const revokedSession = await getSession(firstCookie.header);
assert(revokedSession === null, "Sesi pertama belum tercabut.");

const authenticatedAdmin = await fetch(`${baseUrl}/admin`, {
  headers: { cookie: secondCookie.header },
  redirect: "manual",
});
const authenticatedAdminBody = await authenticatedAdmin.text();
assert(authenticatedAdmin.ok, "Akun aktif tidak dapat membuka area admin.");
assert(
  authenticatedAdminBody.includes("Ruang kerja BEM"),
  "Halaman admin tidak memuat penanda shell BEM.",
);

const signOut = await post(
  "/api/auth/sign-out",
  {},
  { cookie: secondCookie.header },
);
assert(signOut.ok, "Logout sesi aktif gagal.");

const signedOutSession = await getSession(secondCookie.header);
assert(signedOutSession === null, "Sesi masih aktif setelah logout.");

console.log(
  "Auth smoke test lulus: signup tertutup, origin dibatasi, login, cookie, permission, revoke session, dan logout tervalidasi.",
);
