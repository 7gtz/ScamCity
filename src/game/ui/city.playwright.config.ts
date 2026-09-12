import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./",
  testMatch: "city-accessibility.spec.ts",
  use: { baseURL: "http://localhost:3000", browserName: "chromium", channel: "chrome" },
  outputDir: "/tmp/scam-city-ux-test-results",
  reporter: "list",
});
