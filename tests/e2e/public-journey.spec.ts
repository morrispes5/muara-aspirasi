import { expect, type Page, test } from "@playwright/test";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("public journey", () => {
  test("home exposes the two primary aspiration actions", async ({ page }) => {
    const browserErrors = captureBrowserErrors(page);
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Suara kampus, sampai ke tempat yang tepat/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Kirim Aspirasi" }).first(),
    ).toHaveAttribute("href", "/aspirasi/kirim");
    await expect(
      page.getByRole("link", { name: "Lacak Aspirasi" }).first(),
    ).toHaveAttribute("href", "/aspirasi/lacak");
    expect(browserErrors).toEqual([]);
  });

  test("privacy page renders a meaningful main landmark without an error overlay", async ({
    page,
  }) => {
    const browserErrors = captureBrowserErrors(page);
    await page.goto("/kebijakan-privasi");

    await expect(page.locator("main#konten-utama")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Privasi bukan catatan kaki/i }),
    ).toBeVisible();
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
    expect(browserErrors).toEqual([]);
  });
});
