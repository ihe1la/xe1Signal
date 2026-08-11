import { expect, test } from "@playwright/test";

test("Discover includes Study and Tools in the desktop sidebar", async ({ page }) => {
  await page.goto("/discover");

  const sidebar = page.locator("aside").first();
  for (const label of ["Discover", "Frequencies", "Archive", "Vibe", "Study", "Tools", "People"]) {
    await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
});

test("Archive remains reachable on mobile", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("/login");
  await page.getByLabel("Email or username").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 30_000 });
  await page.goto("/archive?tab=collections");

  await expect(page.getByRole("heading", { name: "Your library", exact: true })).toBeVisible();
  await page.close();
});
