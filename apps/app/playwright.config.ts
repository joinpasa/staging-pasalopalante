import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Resolve a Chromium binary that actually runs in this environment.
 *
 * Sandboxes ship a pre-installed Chromium revision; newer headless-shell
 * downloads can be missing system libraries. Prefer the full pre-installed
 * Chromium when present, otherwise fall back to Playwright's default.
 */
function resolveChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/ms-playwright";
  if (!fs.existsSync(root)) return undefined;
  const candidates = fs
    .readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort()
    .reverse()
    .map((d) => path.join(root, d, "chrome-linux", "chrome"))
    .filter((p) => fs.existsSync(p));
  return candidates[0];
}

const executablePath = resolveChromium();

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/e2e/.output",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8081",
    trace: "off",
    screenshot: "off",
    launchOptions: executablePath ? { executablePath } : {},
  },
});
