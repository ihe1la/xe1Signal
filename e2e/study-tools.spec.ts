import { expect, test } from "@playwright/test";

function collectLocalIssues(page: import("@playwright/test").Page) {
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    const knownExternalError = text.includes("ClientFetchError") || text.includes("Failed to load resource: the server responded with a status of 403");
    if (message.type() === "error" && !knownExternalError) issues.push(`console ${text}`);
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

async function expectRemoteFrame(page: import("@playwright/test").Page, title: string, url: string) {
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  const iframe = page.locator(`iframe[title="${title}"]`);
  await expect(iframe).toHaveAttribute("src", url);
  await expect(page.getByRole("link", { name: /Open original/ })).toHaveAttribute("target", "_blank");
  await expect(iframe).toBeVisible();
}

test("Study and Tools keep the existing desktop shell and embed their original apps", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  const sidebar = page.locator("aside").first();
  await expect(sidebar.getByRole("link", { name: "Study", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Tools", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "People", exact: true })).toBeVisible();
  await expectRemoteFrame(page, "Study", "https://tracker.l30on.top/");

  await page.goto("/tools");
  await expectRemoteFrame(page, "Tools", "https://l30on.top/dashboard/");
  expect(issues).toEqual([]);
});

test("Study and Tools remain available through the existing mobile navigation", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  const navigation = page.getByRole("navigation");
  const studyLink = navigation.getByRole("link", { name: "Study", exact: true });
  const toolsLink = navigation.getByRole("link", { name: "Tools", exact: true });
  await expect(studyLink).toBeVisible();
  await expect(toolsLink).toBeVisible();
  await toolsLink.scrollIntoViewIfNeeded();
  await expect(page.locator('iframe[title="Study"]')).toHaveCSS("width", /.+/);

  await page.goto("/tools");
  await expect(page.locator('iframe[title="Tools"]')).toBeVisible();
  expect(issues).toEqual([]);
  await page.close();
});
