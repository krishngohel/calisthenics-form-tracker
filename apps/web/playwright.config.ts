import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the static export (the same bundle the iOS
 * app ships) at iPhone size. Chromium supplies a fake camera so the full
 * pose pipeline (worker, model load, Start) is exercised.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4173",
    ...devices["iPhone 14"],
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "iphone-chromium",
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
        permissions: ["camera"],
        launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
      },
    },
  ],
  webServer: {
    command: "node scripts/serve-out.mjs",
    url: "http://localhost:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
