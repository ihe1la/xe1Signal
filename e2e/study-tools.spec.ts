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
  await expect(page.getByRole("tab", { name: "Findings" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Claim Chain" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Snippets" })).toBeVisible();
  await expect(page.getByLabel("Findings section")).toBeVisible();
  await expect(page.getByLabel("Capture finding")).toBeVisible();

  await page.getByLabel("Capture finding").fill("saw X-Request-Id on api.target.com #header");
  await page.getByRole("button", { name: "Save finding" }).click();
  await expect(page.getByLabel("Findings list")).toContainText("saw X-Request-Id on api.target.com #header");

  await page.getByLabel("Search findings").fill("request-id");
  await expect(page.getByLabel("Findings list")).toContainText("X-Request-Id");

  expect(issues).toEqual([]);
});

test("Tools claim chain can save a spine", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/tools");
  await page.evaluate(() => window.localStorage.removeItem("xe1signal-tools-claim-chains-v1"));
  await page.reload();
  await page.getByRole("tab", { name: "Claim Chain" }).click();
  await expect(page.getByLabel("Claim Chain section")).toBeVisible();
  await page.getByLabel("Claim").fill("/users/{id} leaks profiles #idor");
  await page.getByLabel("Proof").fill("Authed as A, fetched B → 200");
  await page.getByLabel("Impact").fill("PII exposure across accounts");
  await page.getByLabel("Next").fill("Map object endpoints");
  await page.getByRole("button", { name: "Save chain" }).click();
  await expect(page.getByLabel("Claim chains list")).toContainText("/users/{id} leaks profiles #idor");
  await expect(page.getByLabel("Claim chains list")).toContainText("PII exposure");
  expect(issues).toEqual([]);
});

test("Tools snippets can encode Base64", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/tools");
  await page.getByRole("tab", { name: "Snippets" }).click();
  await expect(page.getByLabel("Snippets section")).toBeVisible();
  await page.getByRole("button", { name: /Base64 Encode/ }).click();
  await page.getByLabel("Input").fill("hello");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByLabel("Output")).toHaveValue("aGVsbG8=");
  expect(issues).toEqual([]);
});

test("Study and Tools remain available through mobile navigation", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  await expect(page.getByRole("link", { name: "Study", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Tools", exact: true }).first()).toBeVisible();

  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Snippets" })).toBeVisible();
  expect(issues).toEqual([]);
  await page.close();
});
