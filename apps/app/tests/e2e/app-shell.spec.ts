import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke + layout regression suite for the installed-app screens.
 *
 * It confirms every tab launches without runtime errors and that the bottom
 * navigation stays flush against the content (no dead gap) on the phone
 * resolutions most iPhone and Android users have.
 */

const DEVICES = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "iphone-13-mini", width: 375, height: 812 },
  { name: "iphone-15", width: 393, height: 852 },
  { name: "iphone-15-pro-max", width: 430, height: 932 },
  { name: "pixel-5", width: 393, height: 851 },
  { name: "pixel-8-pro", width: 412, height: 892 },
  { name: "galaxy-s20", width: 360, height: 800 },
  { name: "galaxy-a51", width: 412, height: 914 },
] as const;

const SCREENS = [
  { path: "/", heading: /hola/i },
  { path: "/wall", heading: /wall of kindness/i },
  { path: "/pass", heading: /pass it forward/i },
  { path: "/map", heading: /kindness/i },
  { path: "/badges", heading: /badge|milestone/i }|milestone/i },
] as const;

/** Max allowed dead space, in CSS px, between content end and the tab bar. */
const MAX_BOTTOM_GAP = 28;

/** Dev-only React/Vite console noise that is not an app failure. */
const IGNORED_CONSOLE = [/^Warning:/, /React DevTools/i, /\[vite\]/i, /favicon/i];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (IGNORED_CONSOLE.some((r) => r.test(text))) return;
    errors.push(text);
  });
  return errors;
}

async function measureBottomGap(page: Page) {
  // Scroll to the very end so the measurement reflects what a user sees when
  // they reach the bottom of the screen.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(250);

  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="App sections"]');
    const main = document.querySelector("main");
    if (!nav || !main) return null;

    const navRect = nav.getBoundingClientRect();
    const children = Array.from(main.querySelectorAll("*")).filter((el) => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        r.width > 0 &&
        r.height > 0 &&
        style.visibility !== "hidden" &&
        style.position !== "fixed"
      );
    });
    const contentBottom = children.reduce(
      (max, el) => Math.max(max, el.getBoundingClientRect().bottom),
      main.getBoundingClientRect().top,
    );

    const scrollable = document.documentElement.scrollHeight > window.innerHeight + 4;

    return {
      scrollable,
      navTop: navRect.top,
      navBottom: navRect.bottom,
      contentBottom,
      innerHeight: window.innerHeight,
      gap: navRect.top - contentBottom,
    };
  });
}

for (const device of DEVICES) {
  test.describe(`${device.name} (${device.width}x${device.height})`, () => {
    test.use({ viewport: { width: device.width, height: device.height } });

    for (const screen of SCREENS) {
      test(`launches ${screen.path} with the tab bar flush to content`, async ({
        page,
      }, testInfo) => {
        const errors = collectErrors(page);

        await page.goto(screen.path, { waitUntil: "networkidle" });

        // The screen mounted and rendered its own content, not a blank shell.
        const nav = page.locator('nav[aria-label="App sections"]');
        await expect(nav).toBeVisible();
        await expect(page.locator("main")).not.toBeEmpty();
        await expect(page.getByText(screen.heading).first()).toBeVisible();

        const metrics = await measureBottomGap(page);
        expect(metrics, "nav and main must both render").not.toBeNull();

        // Tab bar is pinned to the bottom edge of the viewport.
        expect(Math.abs(metrics!.navBottom - metrics!.innerHeight)).toBeLessThanOrEqual(2);

        if (metrics!.scrollable) {
          // On scrolling screens the content must end at the tab bar once the
          // user reaches the bottom — no dead strip of padding underneath.
          // Negative gaps are fine: content scrolls beneath the translucent bar.
          expect(
            metrics!.gap,
            `dead space below content on ${screen.path}: ${metrics!.gap}px`,
          ).toBeLessThanOrEqual(MAX_BOTTOM_GAP);
        } else {
          // Short screens must not introduce a scrollable strip of empty space
          // just to clear the tab bar.
          const overflow = await page.evaluate(
            () => document.documentElement.scrollHeight - window.innerHeight,
          );
          expect(
            overflow,
            `${screen.path} scrolls with nothing to show below the fold`,
          ).toBeLessThanOrEqual(4);
        }

        const shot = await page.screenshot();
        await testInfo.attach(`${device.name}${screen.path.replace(/\//g, "-")}.png`, {
          body: shot,
          contentType: "image/png",
        });

        expect(errors, `console/page errors on ${screen.path}`).toEqual([]);
      });
    }
  });
}
