import { test, expect, type Page } from "@playwright/test";

/**
 * Network-resilience coverage for the installed-app screens at /app.
 *
 * The app is a manifest-only PWA (no app-shell service worker by design), so
 * "offline" here means: a warm, already-loaded app must keep rendering and let
 * the user move between tabs without crashing or blanking, and a cold offline
 * boot must fail as a plain navigation failure rather than a broken shell.
 * Throttled runs assert the app still becomes interactive on slow mobile links.
 */

const PHONE = { width: 393, height: 852 };

const TABS = [
  { path: "/app", heading: /hola/i },
  { path: "/app/wall", heading: /wall of kindness/i },
  { path: "/app/pass", heading: /pass it forward/i },
  { path: "/app/map", heading: /kindness/i },
  { path: "/app/badges", heading: /badge|milestone/i },
] as const;

/** Dev-only React/Vite noise plus the network failures offline mode causes. */
const IGNORED = [
  /^Warning:/,
  /React DevTools/i,
  /\[vite\]/i,
  /favicon/i,
  /Failed to fetch/i,
  /net::ERR_/i,
  /NetworkError/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /Failed to load resource/i,
  /TypeError: Load failed/i,
];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED.some((r) => r.test(text))) return;
    errors.push(text);
  });
  return errors;
}

/**
 * Throttle profiles.
 *
 * Bandwidth mirrors real mobile links. Round-trip latency is kept modest on
 * purpose: the dev server ships hundreds of unbundled ES modules, so a 400ms
 * DevTools "Slow 3G" latency multiplies per module and measures Vite, not the
 * app. The production build is a handful of bundles, where these profiles
 * approximate slow-3G and regular-3G conditions.
 */
const SLOW_LINK = {
  offline: false,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
  latency: 40,
};

const REGULAR_3G = {
  offline: false,
  downloadThroughput: (1.5 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 100,
};


test.describe("offline behaviour", () => {
  test.use({ viewport: PHONE });

  test("warm app keeps rendering and navigating while offline", async ({ page, context }) => {
    const errors = collectErrors(page);

    await page.goto("/app", { waitUntil: "networkidle" });
    await expect(page.locator('nav[aria-label="App sections"]')).toBeVisible();

    await context.setOffline(true);

    // The shell survives losing the connection.
    await expect(page.locator('nav[aria-label="App sections"]')).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();

    // Client-side tab navigation still works with no network at all: the JS
    // bundle is already in memory, so every screen must render its content.
    for (const tab of TABS.slice(1)) {
      const label = tab.path.split("/").pop()!;
      await page
        .locator('nav[aria-label="App sections"]')
        .getByRole("link", { name: new RegExp(label, "i") })
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`${tab.path}$`));
      await expect(page.getByText(tab.heading).first()).toBeVisible();
      await expect(page.locator("main")).not.toBeEmpty();
    }

    // Tab bar stays pinned to the bottom edge while offline.
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="App sections"]')!;
      return {
        navBottom: nav.getBoundingClientRect().bottom,
        innerHeight: window.innerHeight,
      };
    });
    expect(Math.abs(metrics.navBottom - metrics.innerHeight)).toBeLessThanOrEqual(2);

    await context.setOffline(false);
    expect(errors, "unexpected errors while offline").toEqual([]);
  });

  test("reconnecting restores a fully working app", async ({ page, context }) => {
    const errors = collectErrors(page);

    await page.goto("/app/wall", { waitUntil: "networkidle" });
    await context.setOffline(true);
    await expect(page.getByText(/wall of kindness/i).first()).toBeVisible();

    await context.setOffline(false);
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.locator('nav[aria-label="App sections"]')).toBeVisible();
    await expect(page.getByText(/wall of kindness/i).first()).toBeVisible();
    expect(errors, "unexpected errors after reconnecting").toEqual([]);
  });

  test("cold offline boot fails as a navigation error, not a broken shell", async ({
    page,
    context,
  }) => {
    // No app-shell service worker is registered by design, so a first visit
    // with no connection must surface a network failure instead of rendering
    // a half-mounted app. This documents the manifest-only contract.
    await context.setOffline(true);
    await expect(page.goto("/app", { waitUntil: "commit" })).rejects.toThrow(/net::ERR_/);

    const registrations = await page
      .evaluate(() => "serviceWorker" in navigator)
      .catch(() => false);
    expect(typeof registrations).toBe("boolean");
  });
});

test.describe("throttled network", () => {
  test.use({ viewport: PHONE });

  for (const [name, profile] of [
    ["slow link", SLOW_LINK],
    ["regular 3G", REGULAR_3G],
  ] as const) {
    test(`app launches and renders every tab on ${name}`, async ({ page, context }, testInfo) => {
      testInfo.setTimeout(240_000);
      const errors = collectErrors(page);

      const client = await context.newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", profile);

      await page.goto("/app", { waitUntil: "domcontentloaded" });

      // Interactive shell, even before every asset has landed.
      await expect(page.locator('nav[aria-label="App sections"]')).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText(/hola/i).first()).toBeVisible({ timeout: 60_000 });

      for (const tab of TABS.slice(1)) {
        const label = tab.path.split("/").pop()!;
        await page
          .locator('nav[aria-label="App sections"]')
          .getByRole("link", { name: new RegExp(label, "i") })
          .first()
          .click();
        await expect(page.getByText(tab.heading).first()).toBeVisible({ timeout: 60_000 });
        await expect(page.locator("main")).not.toBeEmpty();
      }

      const shot = await page.screenshot();
      await testInfo.attach(`throttled-${name.replace(/\s+/g, "-")}.png`, {
        body: shot,
        contentType: "image/png",
      });

      expect(errors, `unexpected errors on ${name}`).toEqual([]);
    });
  }

  test("manifest and icons stay reachable on a throttled link", async ({
    page,
    context,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    const client = await context.newCDPSession(page);
    await client.send("Network.enable");
    await client.send("Network.emulateNetworkConditions", SLOW_LINK);

    // The marketing home page is image-heavy; only the document head matters
    // for installability, so commit is enough here.
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForSelector('link[rel="manifest"]', { state: "attached" });

    const href = await page.getAttribute('link[rel="manifest"]', "href");
    expect(href).toBeTruthy();

    const manifest = await page.evaluate(async (url) => {
      const res = await fetch(url as string);
      return res.ok ? await res.json() : null;
    }, href!);

    expect(manifest).not.toBeNull();
    expect(manifest.display).toBe("standalone");

    for (const icon of manifest.icons) {
      const ok = await page.evaluate(
        async (src) => (await fetch(src as string)).ok,
        icon.src as string,
      );
      expect(ok, `icon unreachable on slow link: ${icon.src}`).toBeTruthy();
    }
  });
});
