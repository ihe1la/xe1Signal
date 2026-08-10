import { expect, test } from "@playwright/test";

test("Vibe uses the local Unstream WILDFLOWER pipeline", async ({ page, browser }) => {
  test.skip(process.env.RUN_VIBE_E2E !== "true", "Requires the configured local Unstream service");
  test.setTimeout(180_000);
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("status of 404")) issues.push(`console ${message.text()}`); });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (new URL(request.url()).hostname === "127.0.0.1" && !failure.includes("ERR_ABORTED")) issues.push(`requestfailed ${request.method()} ${request.url()} ${failure}`);
  });
  page.on("response", (response) => { if (response.status() >= 500 && !response.url().includes("/api/internal/lab/access")) issues.push(`${response.status()} ${response.url()}`); });

  await page.goto("/login");
  await page.getByLabel("Email").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 30_000 });

  await page.goto("/vibe");
  await expect(page.getByRole("heading", { name: "Vibe, together." })).toBeVisible();
  const clear = page.getByRole("button", { name: "Clear all" });
  if (await clear.count()) {
    await clear.click();
    await expect(clear).toHaveCount(0);
  }

  const queued = page.waitForResponse((response) => response.url().endsWith("/api/vibe/queue") && response.request().method() === "POST");
  await page.getByLabel("Music link").fill("https://www.youtube.com/watch?v=wKBYEhTgoHU");
  await page.getByRole("button", { name: "Add to vibe" }).click();
  const queuedResponse = await queued;
  expect(queuedResponse.status()).toBe(201);
  await expect(page.getByText("WILDFLOWER (Music Video)", { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  await expect.poll(async () => {
    const response = await page.request.get("/api/vibe");
    const data = await response.json();
    return data.nowPlaying?.fileUrl || "pending";
  }, { timeout: 120_000, intervals: [2_000, 3_000, 5_000] }).toMatch(/\/api\/vibe\/queue\/.*\/file/);

  const snapshotResponse = await page.request.get("/api/vibe");
  const snapshot = await snapshotResponse.json();
  expect(snapshot.room.isPlaying).toBe(true);
  expect(snapshot.nowPlaying.fileUrl).toMatch(/\/api\/vibe\/queue\/.*\/file/);
  const audioResponse = await page.request.get(snapshot.nowPlaying.fileUrl, { headers: { range: "bytes=0-1" } });
  expect([200, 206]).toContain(audioResponse.status());
  expect(audioResponse.headers()["content-type"]).toMatch(/^audio\//);
  await expect.poll(() => page.locator("audio").evaluate((audio) => (audio as HTMLAudioElement).currentSrc), { timeout: 15_000 }).toMatch(/\/api\/vibe\/queue\/.*\/file/);

  const second = await browser.newPage();
  await second.goto("/login");
  await second.getByLabel("Email").fill("test@signal.local");
  await second.locator("#password").fill("Archive!2026");
  await second.getByRole("button", { name: "Sign in" }).click();
  await expect(second).toHaveURL(/\/discover$/, { timeout: 30_000 });
  await second.goto("/vibe");
  await expect(second.getByText("WILDFLOWER (Music Video)", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await second.getByRole("button", { name: "Pause vibe" }).click();
  await expect(page.getByText("paused", { exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Play vibe" }).click();
  await expect(second.getByText("live", { exact: true })).toBeVisible({ timeout: 10_000 });
  await second.close();
  expect(issues).toEqual([]);
});
