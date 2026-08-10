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

test("Study and Tools keep the simplified shell and Pinqued attribution", async ({ page }) => {
  test.setTimeout(60_000);
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  const sidebar = page.locator("aside").first();
  await expect(page.getByRole("heading", { name: "Study", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Study", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Tools", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "People", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Lab", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Inbox", exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: "Notifications", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open original/ })).toHaveAttribute("href", "https://tracker.l30on.top/");

  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pinqued" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Open original/ })).toHaveAttribute("href", "https://pinqued.top/");
  await expect(page.getByRole("button", { name: /Base64/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /JSON Formatter/ })).toBeVisible();
  for (const name of ["HTML Encode / Decode", "JWT Decoder", "URL Parser", "Timestamp Converter", "Text Diff", "Hash Generator", "UUID Generator", "Lorem Ipsum"]) {
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "More tools · Pinqued workspace" })).toBeVisible();
  await expect(page.getByRole("link", { name: "l30on dashboard" })).toHaveAttribute("href", "https://l30on.top/dashboard/");
  await expect(page.getByRole("link", { name: /Recon/ })).toHaveAttribute("href", "https://pinqued.top/recon");

  await page.getByLabel("Search tools").fill("JWT");
  await expect(page.getByRole("button", { name: /JWT Decoder/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Base64/ })).toHaveCount(0);
  await page.getByLabel("Search tools").fill("");

  await page.getByRole("button", { name: /JSON Formatter/ }).click();
  await page.getByLabel("Tool input").fill('{"signal":true}');
  await page.getByRole("button", { name: "Format", exact: true }).click();
  await expect(page.getByLabel("Tool output")).toHaveValue(/"signal": true/);
  expect(issues).toEqual([]);
});

test("Study and Tools remain available through mobile navigation", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const issues = collectLocalIssues(page);

  await page.goto("/study");
  const navigation = page.getByRole("navigation");
  await expect(navigation.getByRole("link", { name: "Study", exact: true })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();

  await page.goto("/tools");
  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open original/ })).toHaveAttribute("href", "https://pinqued.top/");
  expect(issues).toEqual([]);
  await page.close();
});
