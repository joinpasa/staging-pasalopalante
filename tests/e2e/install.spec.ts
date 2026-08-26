import { test, expect } from "@playwright/test";

/**
 * Confirms the installability contract the iOS and Android home-screen flows
 * depend on: manifest served and standalone, icons reachable, iOS meta tags in
 * place, and the standalone start_url booting the app without errors.
 */

test("manifest is served with standalone display and reachable icons", async ({
  page,
  request,
}) => {
  await page.goto("/");

  const href = await page.getAttribute('link[rel="manifest"]', "href");
  expect(href).toBeTruthy();

  const res = await request.get(href!);
  expect(res.ok()).toBeTruthy();

  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name).toBeTruthy();
  expect(manifest.start_url).toBeTruthy();
  expect(manifest.scope).toBe("/");
  expect(manifest.theme_color).toBeTruthy();
  expect(manifest.background_color).toBeTruthy();

  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(
    manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes("maskable")),
  ).toBeTruthy();

  for (const icon of manifest.icons) {
    const iconRes = await request.get(icon.src);
    expect(iconRes.ok(), `icon missing: ${icon.src}`).toBeTruthy();
  }
});

test("iOS home-screen meta tags and apple-touch-icon are present", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(
    page.locator('meta[name="apple-mobile-web-app-status-bar-style"]'),
  ).toHaveCount(1);
  await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);

  const touchIcon = await page.getAttribute('link[rel="apple-touch-icon"]', "href");
  expect(touchIcon).toBeTruthy();
  expect((await request.get(touchIcon!)).ok()).toBeTruthy();
});

test("app boots in standalone display mode without errors", async ({ browser, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();

  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // Ignore dev-only React/Vite console noise.
    if (/^Warning:|React DevTools|\[vite\]|favicon/i.test(text)) return;
    errors.push(text);
  });

  // Emulate an installed launch: standalone display-mode + the manifest start_url.
  await page.emulateMedia({ media: "screen" });
  await context.addInitScript(() => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      query.includes("display-mode: standalone")
        ? ({
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList)
        : original.call(window, query)) as typeof window.matchMedia;
  });

  await page.goto(manifest.start_url, { waitUntil: "networkidle" });
  await expect(page.locator("#root")).not.toBeEmpty();

  await page.goto("/app", { waitUntil: "networkidle" });
  await expect(page.locator('nav[aria-label="App sections"]')).toBeVisible();

  expect(errors, "console/page errors during standalone launch").toEqual([]);
  await context.close();
});
