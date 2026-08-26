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

  test("app accepts a replacement value and keeps presets synchronized", async ({ page }) => {
    await page.goto("/app/join", { waitUntil: "domcontentloaded" });

    const pledge = page.getByLabel("Custom number of acts");
    await expect(pledge).toHaveValue("10");
    await pledge.fill("");
    await expect(pledge).toHaveValue("");
    await pledge.pressSequentially("73");
    await expect(pledge).toHaveValue("73");
    await expect(page.getByRole("button", { name: "Commit to 73 acts & join" })).toBeVisible();

    await page.getByRole("button", { name: "25", exact: true }).click();
    await expect(pledge).toHaveValue("25");
    await expect(page.getByRole("button", { name: "Commit to 25 acts & join" })).toBeVisible();
  });
});