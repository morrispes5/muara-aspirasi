import { expect, test } from "@playwright/test";

const credential = {
  trackingCode: "MA-0123456789ABCDEF",
  trackingSecret: "Aa_1-".repeat(8) + "xyz",
};
const timeline = {
  trackingCode: credential.trackingCode,
  status: "RECEIVED",
  submittedAt: "2026-09-20T09:00:00Z",
  lastUpdatedAt: "2026-09-20T09:00:00Z",
  events: [
    {
      createdAt: "2026-09-20T09:00:00Z",
      status: "RECEIVED",
      message: "BEM sedang memeriksa aspirasi.",
    },
  ],
  publicUpdates: [],
};

test("one receipt submits by POST without URL or automatic storage exposure", async ({
  page,
}) => {
  await page.route("**/api/aspirasi/lacak", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual(credential);
    await route.fulfill({ json: { timeline } });
  });
  await page.goto("/aspirasi/lacak");
  await page
    .getByLabel("Bukti pelacakan pribadi")
    .fill(`${credential.trackingCode}.${credential.trackingSecret}`);
  await page
    .getByRole("button", { name: "Lacak aspirasi", exact: true })
    .click();
  await expect(page.getByText("BEM sedang memeriksa aspirasi.")).toBeVisible();
  expect(page.url()).not.toContain(credential.trackingSecret);
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage).not.toContain(credential.trackingSecret);
});

test("old two-field credentials still work and rate limit feedback is visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/aspirasi/lacak", async (route) => {
    expect(route.request().postDataJSON()).toEqual(credential);
    await route.fulfill({
      status: 429,
      headers: { "Retry-After": "120" },
      json: {
        error: {
          message: "Batas pelacakan tercapai. Coba lagi dalam 2 menit.",
        },
      },
    });
  });
  await page.goto("/aspirasi/lacak");
  await page
    .getByRole("button", { name: "Punya kode dan token lama?" })
    .click();
  await page
    .getByLabel("Kode pelacakan", { exact: true })
    .fill(credential.trackingCode);
  await page.getByLabel(/^Token rahasia/).fill(credential.trackingSecret);
  await page
    .getByRole("button", { name: "Lacak aspirasi", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Batas pelacakan" }),
  ).toContainText("2 menit");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("anonymous visitors get login, never the admin workspace or reports", async ({
  page,
  request,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByRole("heading", { name: "Masuk admin." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email admin")).toHaveValue("");
  expect((await request.get("/api/admin/reports")).status()).toBe(401);
});

test("student form blocks short NIM and missing contact before moving on", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_CHECK_FORM,
    "Requires an authorized database/Turnstile environment; enabled for live smoke.",
  );
  await page.goto("/aspirasi/kirim");
  await page.getByLabel("Nama lengkap", { exact: true }).fill("Mahasiswa QA");
  await page.getByLabel("NIM", { exact: true }).fill("123456");
  await page.getByRole("button", { name: /Lanjut/ }).click();
  await expect(page.getByText(/NIM harus 7–20 angka/)).toBeVisible();
  await page.getByLabel("NIM", { exact: true }).fill("0012345678");
  await page.getByRole("button", { name: /Lanjut/ }).click();
  await expect(page.getByText(/Email: Kolom ini wajib diisi/)).toBeVisible();
});

test("student restores receipt from a local file and submits only via POST", async ({
  page,
}) => {
  const value = credential.trackingCode + "." + credential.trackingSecret;
  await page.route("**/api/aspirasi/lacak", (route) =>
    route.fulfill({ json: { timeline } }),
  );
  await page.goto("/aspirasi/lacak");
  await page.getByLabel("Buka file bukti (.txt)").setInputFiles({
    name: "bukti.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(value),
  });
  await expect(page.getByLabel("Bukti pelacakan pribadi")).toHaveValue(value);
  await page
    .getByRole("button", { name: "Lacak aspirasi", exact: true })
    .click();
  await expect(page.getByText("BEM sedang memeriksa aspirasi.")).toBeVisible();
  expect(page.url()).not.toContain(credential.trackingSecret);
});

test("previously opted-in backup can be selected; malformed files are rejected", async ({
  page,
}) => {
  await page.goto("/aspirasi/lacak");
  await page.evaluate(
    (value) =>
      localStorage.setItem(
        "muara.private-receipts.v1",
        JSON.stringify([{ value, savedAt: Date.now() }]),
      ),
    credential.trackingCode + "." + credential.trackingSecret,
  );
  await page.getByRole("button", { name: "Bukti di perangkat ini" }).click();
  await page
    .getByRole("button", { name: credential.trackingCode, exact: true })
    .click();
  await expect(page.getByLabel("Bukti pelacakan pribadi")).toHaveValue(
    credential.trackingCode + "." + credential.trackingSecret,
  );
  await page.getByLabel("Buka file bukti (.txt)").setInputFiles({
    name: "wrong.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a receipt"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "File bukan bukti" }),
  ).toBeVisible();
});
