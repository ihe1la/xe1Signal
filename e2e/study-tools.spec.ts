import { expect, test } from "@playwright/test";

function collectLocalIssues(page: import("@playwright/test").Page) {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    const knownAuthError = text.includes("ClientFetchError") || text.includes("errors.authjs.dev#autherror");
    if (message.type() === "error" && !knownAuthError) issues.push(`console ${text}`);
  });
  page.on("requestfailed", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      const failure = request.failure()?.errorText ?? "unknown";
      if (!failure.includes("ERR_ABORTED")) issues.push(`requestfailed ${request.method()} ${request.url()} ${failure}`);
    }
  });
  page.on("response", (response) => {
    const hostname = new URL(response.url()).hostname;
    if ((hostname === "localhost" || hostname === "127.0.0.1") && response.status() >= 500) issues.push(`${response.status()} ${response.url()}`);
  });
  return issues;
}

test("Study and Tools stay private for guests", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/discover");
  const sidebar = page.locator("aside").first();
  await expect(sidebar.getByRole("link", { name: "Study", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Tools", exact: true })).toHaveCount(0);

  await page.goto("/study");
  await expect(page.getByRole("heading", { name: "Study", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

  expect(issues).toEqual([]);
});

test("Study and Tools stay private for non-owner accounts", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/login");
  await page.getByLabel("Email or username").fill("test@signal.local");
  await page.locator("#password").fill("Archive!2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 30_000 });

  const sidebar = page.locator("aside").first();
  await expect(sidebar.getByRole("link", { name: "Study", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Tools", exact: true })).toHaveCount(0);

  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toHaveCount(0);

  expect(issues).toEqual([]);
});

test("Owner can open Tools findings", async ({ page }) => {
  test.setTimeout(60_000);
  test.skip(process.env.RUN_OWNER_TOOLS_E2E !== "true", "Requires an ihe1la login on this environment");
  const issues = collectLocalIssues(page);

  await page.goto("/login");
  await page.getByLabel("Email or username").fill(process.env.OWNER_E2E_EMAIL || "");
  await page.locator("#password").fill(process.env.OWNER_E2E_PASSWORD || "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 30_000 });

  await page.goto("/tools");
  await page.evaluate(() => window.localStorage.removeItem("xe1signal-tools-findings-v1"));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Findings" })).toBeVisible();
  await expect(page.getByLabel("Findings list")).toContainText("linktr.ee/ihe1la");

  expect(issues).toEqual([]);
});

test("Study and Tools stay hidden in mobile nav for guests", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const issues = collectLocalIssues(page);

  await page.goto("/discover");
  await expect(page.getByRole("link", { name: "Study", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Tools", exact: true })).toHaveCount(0);

  expect(issues).toEqual([]);
  await page.close();
});
