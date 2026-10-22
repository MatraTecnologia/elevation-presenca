import "dotenv/config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  use: { baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000", channel: "msedge", headless: true, screenshot: "only-on-failure", trace: "retain-on-failure" },
  reporter: "list",
});
