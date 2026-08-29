import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 360, height: 800 } });

test.describe("custom pledge entry", () => {
  test("website accepts a replacement value without restoring the minimum", async ({ page }) => {
    await page.goto("/commit", { waitUntil: "domcontentloaded" });

    const pledge = page.locator("#pledge");
    await expect(pledge).toHaveValue("10");
    await pledge.fill("");
    await expect(pledge).toHaveValue("");
    await pledge.pressSequentially("73");
    await expect(pledge).toHaveValue("73");
  });
});
