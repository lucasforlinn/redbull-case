import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile();
} catch {}

const BASE_URL = process.env.BASE_URL ?? "https://qa-sample-lucas-forlin.up.railway.app";

export default defineConfig({
  testDir: "./tests",

  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "api",
      testDir: "./tests/api/specs",
    },
    {
      name: "desktop",
      testDir: "./tests/e2e/specs",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
