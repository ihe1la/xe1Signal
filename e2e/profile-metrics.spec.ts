import { expect, test } from "@playwright/test";

test("new profiles use real zero metrics and offer the compact mood picker", async ({ page }) => {
  const username = `metrics_${Date.now()}`;
  await page.goto("/signup");
  await page.getByLabel("Display name").fill("Metric Listener");
  await page.getByLabel("Username").fill(username);
  await page.locator("#password").fill("x");
  await page.locator("#confirmPassword").fill("x");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 15_000 });

  await page.goto(`/profile/${username}`);
  await expect(page.getByRole("heading", { name: "Metric Listener" })).toBeVisible();
  const profile = page.getByRole("main");
  await expect(profile.getByText(`@${username}`, { exact: true })).toBeVisible();
  await expect(profile.getByText("0 strength", { exact: true })).toBeVisible();
  await expect(profile.getByText("0 followers", { exact: true })).toBeVisible();
  await expect(profile.getByText("0 following", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit current mood" }).click();
  await expect(page.getByLabel("Choose a mood symbol")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use 👾" })).toBeVisible();
});
