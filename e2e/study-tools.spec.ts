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

test("Study and Tools findings capture and search", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  const sidebar = page.locator("aside").first();
  await expect(page.getByRole("heading", { name: "Study", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Study", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Tools", exact: true })).toBeVisible();

  await page.goto("/tools");
  await page.evaluate(() => window.localStorage.removeItem("xe1signal-tools-findings-v1"));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByLabel("Findings section")).toBeVisible();
  await expect(page.getByLabel("Capture finding")).toBeVisible();
  await expect(page.getByLabel("Search findings")).toBeVisible();

  await page.getByLabel("Capture finding").fill("saw X-Request-Id on api.target.com #header");
  await page.getByRole("button", { name: "Save finding" }).click();
  await expect(page.getByLabel("Findings list")).toContainText("saw X-Request-Id on api.target.com #header");

  await page.getByLabel("Search findings").fill("request-id");
  await expect(page.getByLabel("Findings list")).toContainText("X-Request-Id");
  await page.getByLabel("Search findings").fill("#missing");
  await expect(page.getByText("No findings match that search.")).toBeVisible();

  expect(issues).toEqual([]);
});

test("Study and Tools remain available through mobile navigation", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  const navigation = page.getByRole("navigation");
  await expect(navigation.getByRole("link", { name: "Study", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Tools", exact: true })).toBeVisible();

  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByLabel("Capture finding")).toBeVisible();
  expect(issues).toEqual([]);
  await page.close();
});
