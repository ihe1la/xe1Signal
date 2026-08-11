import { expect, test } from "@playwright/test";

test("Discover matches the reference shell", async ({ page }) => {
  await page.goto("/discover");

  const sidebar = page.locator("aside").first();
  for (const label of ["Discover", "Frequencies", "Archive", "Vibe", "People", "Inbox", "Notifications"]) {
    await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(sidebar.getByText("My frequencies", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("SIGNAL ARCHIVE", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Signals from the archive", exact: true })).toBeVisible();
  await expect(page.getByText("Fragments worth keeping.", { exact: true })).toBeVisible();
  for (const label of ["ALL", "IMAGE", "LINK", "NOTE", "SONG", "CODE", "SCREENSHOT", "AUDIO", "DOCUMENT"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }

  await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Messages" })).toHaveCount(0);
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
  await expect(page.getByRole("tab", { name: "Collections", exact: true })).toHaveAttribute("aria-selected", "true");

  const navigation = page.getByRole("navigation");
  for (const label of ["Discover", "Library", "Vibe", "Study", "Tools", "People"]) {
    await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await page.close();
});
