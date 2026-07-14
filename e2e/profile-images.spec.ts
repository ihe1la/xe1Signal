import { expect, test } from '@playwright/test';

test('avatar and cover uploads persist only on the signed-in profile', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('hela@signal.local');
  await page.locator('#password').fill('Archive!2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/discover$/);

  await page.goto('/settings');
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles('public/media/archive-landing-bg.png');
  await inputs.nth(1).setInputFiles('src/app/icon.png');

  const uploaded: string[] = [];
  page.on('response', async (response) => {
    if (response.url().endsWith('/api/user/profile-image') && response.status() === 201) {
      const body = await response.json();
      uploaded.push(body.url);
    }
  });
  await page.getByRole('button', { name: 'Save avatar & cover' }).click();
  await expect(page.getByText('Profile images updated')).toBeVisible();
  await expect.poll(() => uploaded.length).toBe(2);
  expect(uploaded.every((url) => url.startsWith('/api/profile-media/'))).toBeTruthy();

  await page.goto('/profile/hela');
  const ownerAvatar = page.locator('img[src^="/api/profile-media/"]').first();
  await expect(ownerAvatar).toBeVisible();
  const ownerAvatarUrl = await ownerAvatar.getAttribute('src');
  const ownerBanner = page.locator('[style*="/api/profile-media/"]').first();
  await expect(ownerBanner).toBeVisible();

  await page.goto('/profile/test');
  if (ownerAvatarUrl) await expect(page.locator(`img[src="${ownerAvatarUrl}"]`)).toHaveCount(0);
});
