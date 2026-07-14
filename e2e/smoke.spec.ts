import { expect, test } from "@playwright/test";

function collectRuntimeIssues(page: import("@playwright/test").Page) {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`console ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    if (
      new URL(request.url()).hostname === "127.0.0.1" &&
      !failure.includes("ERR_ABORTED")
    ) {
      issues.push(`requestfailed ${request.method()} ${request.url()} ${failure}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) issues.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

test("discover renders the reference layout and seeded cards", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Signals from the archive" })).toBeVisible();
  await expect(page.getByText("Tokyo textures", { exact: true })).toBeVisible();
  await expect(page.getByText("Broken flows", { exact: true }).first()).toBeVisible();
  await expect(page.getByPlaceholder("Search signals, frequencies, people...")).toBeVisible();
  await page.screenshot({ path: "test-results/discover-desktop.png", fullPage: true });
  expect(issues).toEqual([]);
});

test("public index is a focused landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Keep what stays/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create your space" })).toBeVisible();
  await expect(page.getByText("Every signal type")).toHaveCount(0);
});

test("owner can sign in and create, view, and edit a signal", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto("/signals/new");
  await expect(page.getByRole("heading", { name: "Save something worth returning to" })).toBeVisible();
  await page.getByPlaceholder("Name this signal").fill("Playwright acceptance signal");
  await page.getByPlaceholder("Add the detail that will help later...").fill("Created through the complete browser flow.");
  const createResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/signals") &&
    response.request().method() === "POST" &&
    response.status() === 201,
  );
  await page.getByRole("button", { name: "Publish" }).click();
  const { signal } = await (await createResponse).json();
  await expect(page).toHaveURL(new RegExp(`/signals/${signal.id}$`));
  await expect(page.getByText("Playwright acceptance signal", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Edit signal" }).click();
  await expect(page.getByRole("heading", { name: "Refine this fragment" })).toBeVisible();
  expect(issues).toEqual([]);
});

test("development password reset exposes a usable local reset link", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@example.com").fill("test@signal.local");
  await page.getByRole("button", { name: "Send reset link" }).click();
  const resetLink = page.getByRole("link", { name: "Reset password" });
  await expect(resetLink).toBeVisible();
  await expect(resetLink).toHaveAttribute("href", /\/reset-password\?token=.+/);
  expect(issues).toEqual([]);
});

test("owner can persist a file signal and protected upload", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto("/signals/new");
  await page.getByRole("button", { name: "FILE" }).click();
  await page.getByPlaceholder("Name this signal").fill("Uploaded acceptance file");
  await page.locator('input[type="file"]').setInputFiles("e2e/fixtures/sample.txt");
  const createResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/signals") && response.request().method() === "POST" && response.status() === 201,
  );
  const uploadResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/uploads") && response.request().method() === "POST" && response.status() === 201,
  );
  await page.getByRole("button", { name: "Publish" }).click();
  const { signal } = await (await createResponse).json();
  await uploadResponse;
  await expect(page).toHaveURL(new RegExp(`/signals/${signal.id}$`));
  await expect(page.getByText("Uploaded acceptance file", { exact: true }).first()).toBeVisible();
  expect(issues).toEqual([]);
});

test("owner can upload and use image, PDF, and music attachments", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover/);

  const uploads = [
    { type: "IMAGE", title: "Uploaded image acceptance", name: "acceptance.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") },
    { type: "DOCUMENT", title: "Uploaded PDF acceptance", name: "acceptance.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF") },
    { type: "SONG", title: "Uploaded music acceptance", name: "acceptance.wav", mimeType: "audio/wav", buffer: createWaveBuffer() },
  ];

  for (const upload of uploads) {
    await page.goto("/signals/new");
    await page.getByRole("button", { name: upload.type }).click();
    await page.getByPlaceholder("Name this signal").fill(upload.title);
    await page.locator('input[type="file"]').setInputFiles({ name: upload.name, mimeType: upload.mimeType, buffer: upload.buffer });
    const createResponse = page.waitForResponse((response) => response.url().endsWith("/api/signals") && response.request().method() === "POST" && response.status() === 201);
    const uploadResponse = page.waitForResponse((response) => response.url().endsWith("/api/uploads") && response.request().method() === "POST" && response.status() === 201);
    await page.getByRole("button", { name: "Publish" }).click();
    const { signal } = await (await createResponse).json();
    await uploadResponse;
    await expect(page).toHaveURL(new RegExp(`/signals/${signal.id}$`));
    await expect(page.getByText(upload.title, { exact: true }).first()).toBeVisible();
    if (upload.type === "IMAGE") await expect(page.getByRole("img", { name: upload.title })).toBeVisible();
    if (upload.type === "DOCUMENT") await expect(page.getByRole("link", { name: `Download ${upload.name}` })).toBeVisible();
    if (upload.type === "SONG") {
      const play = page.getByRole("button", { name: "Play", exact: true });
      await expect(play).toBeEnabled();
      await play.click();
      await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: /(?:Pause|Play) global player/ })).toBeVisible();
      await expect(page.getByLabel("Audio volume")).toBeVisible();
      await page.getByLabel("Audio volume").fill("35");
      await page.getByRole("button", { name: "Mute audio" }).click();
      await expect(page.getByRole("button", { name: "Unmute audio" })).toBeVisible();
      await page.getByRole("button", { name: "Share now playing" }).click();
      const shared = page.waitForResponse((response) => response.url().endsWith("/api/messages") && response.request().method() === "POST" && response.status() === 201);
      await page.getByRole("button", { name: "Send now playing" }).click();
      await shared;
      await page.getByRole("link", { name: "Back to archive" }).click();
      await expect(page).toHaveURL(/\/discover/);
      await expect(page.getByRole("button", { name: /(?:Pause|Play) global player/ })).toBeVisible();
    }
  }
  expect(issues).toEqual([]);
});

test("published signals appear on Discover and messages reach the other account", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectRuntimeIssues(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  const title = `Discover acceptance ${Date.now()}`;
  await page.goto("/signals/new");
  await page.getByPlaceholder("Name this signal").fill(title);
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("link", { name: "Back to archive" }).click();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();

  await page.goto("/signals/new");
  await page.getByRole("button", { name: "SONG" }).click();
  await page.getByPlaceholder("Name this signal").fill("Linked music acceptance");
  await page.getByPlaceholder(/open\.spotify\.com/).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Play here" }).click();
  await expect(page.getByTitle("Embedded music player")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);

  const body = `Private message ${Date.now()}`;
  await page.goto("/inbox/test");
  await page.getByPlaceholder("Write a message...").fill(body);
  const sent = page.waitForResponse((response) => response.url().endsWith("/api/messages") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "Send message" }).click();
  await sent;
  await expect(page.getByText(body, { exact: false })).toBeVisible();
  await page.context().clearCookies();
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill("test@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.goto("/notifications");
  await expect(page.getByText(body, { exact: false })).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByText(body, { exact: false })).toBeVisible();
  await page.locator('a[href="/inbox/hela"]').click();
  await expect(page.getByText(body, { exact: false })).toBeVisible();
  expect(issues).toEqual([]);
});

test("seeded song can be edited, uploaded, revisited, and played", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("hela@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover/);
  await page.goto("/signals/blue/edit");
  await expect(page.getByRole("heading", { name: "Refine this fragment" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "blue-acceptance.wav", mimeType: "audio/wav", buffer: createWaveBuffer() });
  const updateResponse = page.waitForResponse((response) => response.url().endsWith("/api/signals/blue") && response.request().method() === "PATCH" && response.status() === 200);
  const uploadResponse = page.waitForResponse((response) => response.url().endsWith("/api/uploads") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "Update" }).click();
  await updateResponse;
  await uploadResponse;
  await expect(page).toHaveURL(/\/signals\/blue$/);
  const play = page.getByRole("button", { name: "Play", exact: true });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.goto("/signals/blue/edit");
  await expect(page.getByText("blue-acceptance.wav", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove blue-acceptance.wav" }).last()).toBeVisible();
  const fixtureAttachments = page.getByRole("button", { name: "Remove blue-acceptance.wav" });
  while (await fixtureAttachments.count()) {
    const count = await fixtureAttachments.count();
    page.once("dialog", (dialog) => dialog.accept());
    await fixtureAttachments.last().click();
    await expect(fixtureAttachments).toHaveCount(count - 1);
  }
  expect(issues).toEqual([]);
});

test("accounts are isolated, mood persists, and logout ends the session", async ({ page }) => {
  const issues = collectRuntimeIssues(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill("test@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover/);

  await page.goto("/profile/hela");
  await expect(page.getByRole("link", { name: "Edit profile" })).toHaveCount(0);
  await page.goto("/signals/blue/edit");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  issues.splice(0, issues.length);

  await page.goto("/discover");
  await page.getByRole("button", { name: "Edit current mood" }).click();
  const mood = `test mood ${Date.now()}`;
  await page.getByLabel("Current mood").fill(mood);
  await page.getByRole("button", { name: "Save mood" }).click();
  await expect(page.getByText(mood, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "People", exact: true }).first().click();
  await expect(page.getByText(mood, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(issues).toEqual([]);
});

test("mobile layout keeps search and touch navigation available", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const issues = collectRuntimeIssues(page);
  await page.goto("/discover");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByText("Discover", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Open search").click();
  await expect(page.getByPlaceholder("Search the archive...")).toBeVisible();
  await page.screenshot({ path: "test-results/discover-mobile.png", fullPage: true });
  expect(issues).toEqual([]);
  await page.close();
});

function createWaveBuffer() {
  const samples = 8000;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVE", 8);
  buffer.write("fmt ", 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(8000, 24); buffer.writeUInt32LE(16000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}
