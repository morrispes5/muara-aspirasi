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
