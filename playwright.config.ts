import { defineConfig, devices } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", timeout: 30_000, fullyParallel: false, use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000", trace: "retain-on-failure" }, projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 1000 } } }] });
