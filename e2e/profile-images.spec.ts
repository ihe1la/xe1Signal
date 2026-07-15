import { expect, test } from "@playwright/test";

test("settings avatar and cover controls select, upload, and persist images", async ({ page }) => {
  const username = `profile_${Date.now()}`;
  await page.goto("/signup");
  await page.getByLabel("Display name").fill("Profile upload test");
  await page.getByLabel("Username").fill(username);
  await page.locator("#password").fill("x");
  await page.locator("#confirmPassword").fill("x");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/discover$/);

  await page.goto("/settings");
  const save = page.getByRole("button", { name: "Save avatar & cover" });
  await expect(save).toBeDisabled();
  await page.locator("#profile-cover-input").setInputFiles("public/media/archive-landing-bg.png");
  await page.getByLabel("Change avatar").setInputFiles("src/app/icon.png");
  await expect(save).toBeEnabled();

  const uploads: string[] = [];
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/user/profile-image") && response.status() === 201) {
      uploads.push((await response.json()).url);
    }
  });
  await save.click();
  await expect(page.getByText("Profile images updated")).toBeVisible();
  await expect.poll(() => uploads.length).toBe(2);

  await page.goto(`/profile/${username}`);
  await expect(page.getByRole("img", { name: `${username}'s profile picture` })).toBeVisible();
  await expect(page.locator('[style*="/api/profile-media/"]')).toBeVisible();
});
