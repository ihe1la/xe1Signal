import { expect, test } from '@playwright/test';

test('exposes an installable, privacy-safe PWA shell', async ({ page, request }) => {
  await page.goto('/');

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBe('/manifest.webmanifest');

  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: 'Signal Archive',
    short_name: 'Signal',
    start_url: '/',
    display: 'standalone',
    theme_color: '#07080c',
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icon-192x192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/icon-512x512.png', sizes: '512x512' }),
      expect.objectContaining({ src: '/icon-maskable-512x512.png', purpose: 'maskable' }),
    ])
  );

  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.ok(), `${icon.src} should load`).toBeTruthy();
    expect(iconResponse.headers()['content-type']).toContain('image/png');
  }

  const workerResponse = await request.get('/sw.js');
  expect(workerResponse.ok()).toBeTruthy();
  expect(workerResponse.headers()['cache-control']).toContain('no-cache');
  expect(await workerResponse.text()).toContain("url.pathname.startsWith('/api/')");

  await expect
    .poll(() =>
      page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return false;
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.some((registration) => registration.scope === `${location.origin}/`);
      })
    )
    .toBeTruthy();
});
