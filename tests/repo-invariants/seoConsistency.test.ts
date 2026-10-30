import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Keeps the website's crawler-facing pieces in agreement: the routes in
 * App.tsx, the per-route HTML written by scripts/prerender.ts, the host's
 * redirects (public/_redirects) and public/sitemap.xml. A URL that redirects
 * must not also be prerendered as its own page or listed in the sitemap —
 * that's how /how-it-works ended up declaring itself canonical in its
 * static HTML while the live page pointed to /programs.
 */
const WEBSITE = path.resolve(__dirname, "../../apps/website");
const read = (rel: string) => fs.readFileSync(path.join(WEBSITE, rel), "utf8");

/** Paths prerender.ts writes a static page for. */
function prerenderedPaths(): string[] {
  return [...read("scripts/prerender.ts").matchAll(/^\s{4}path: "([^"]+)",$/gm)].map((m) => m[1]);
}

/** Same-site paths the host redirects (public/_redirects, 301/302). */
function hostRedirects(): string[] {
  return read("public/_redirects")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/))
    .filter(([from, , status]) => from.startsWith("/") && !from.includes("*") && /^30[12]$/.test(status ?? ""))
    .map(([from]) => from.replace(/\/$/, "") || "/");
}

/** Routes App.tsx only forwards elsewhere (<Navigate …>). */
function clientRedirects(): string[] {
  return [...read("src/App.tsx").matchAll(/<Route path="([^"]+)" element={<Navigate /g)].map((m) => m[1]);
}

const SITE = "https://pasalopalante.com";

/** Route path → page file it renders (lazy or eager import in App.tsx). */
function routePages(): Map<string, string> {
  const app = read("src/App.tsx");
  const files = new Map<string, string>();
  for (const m of app.matchAll(/const (\w+) = lazy\(\(\) => import\("\.\/pages\/(\w+)\.tsx"\)\)/g)) files.set(m[1], m[2]);
  for (const m of app.matchAll(/^import (\w+) from "\.\/pages\/(\w+)\.tsx";/gm)) files.set(m[1], m[2]);
  const routes = new Map<string, string>();
  for (const m of app.matchAll(/<Route path="([^"]+)" element={<(\w+) \/>} \/>/g)) {
    if (files.has(m[2])) routes.set(m[1], files.get(m[2])!);
  }
  return routes;
}

/** The canonical URL a page declares through <SEO path=… siteUrl=…>. */
function declaredCanonical(page: string): string | null {
  const src = read(`src/pages/${page}.tsx`);
  const seo = src.match(/<SEO[\s\S]*?\/>/)?.[0];
  const pathAttr = seo?.match(/path="([^"]+)"/)?.[1];
  if (!seo || !pathAttr) return null;
  const origin = /siteUrl={SITE_URL}/.test(seo) ? src.match(/const SITE_URL = "([^"]+)"/)![1] : SITE;
  return `${origin}${pathAttr}`;
}

/** Canonical URL of each prerendered page (prerender.ts's siteUrl override or the default site). */
function prerenderedCanonicals(): string[] {
  const src = read("scripts/prerender.ts");
  return [...src.matchAll(/^\s{4}path: "([^"]+)",[\s\S]*?(?=^\s{4}path: |^\];)/gm)].map((m) => {
    const site = m[0].match(/siteUrl: "([^"]+)"/)?.[1] ?? SITE;
    return `${site}${m[1]}`;
  });
}

/** Routes App.tsx documents as unlisted on purpose — never in the sitemap. */
const UNLISTED = ["/ambassadors", "/partners/apply"];

/** Sign-in, account and personal-link routes — never indexed. */
const UTILITY_ROUTES = ["/auth", "/reset-password", "/account", "/account/settings", "/share/thanks/:id", "/wave", "/wave/:id"];

/** True when a page keeps itself out of search results (useNoIndex() from src/hooks or <SEO noindex>). */
function pageIsNoIndex(page: string): boolean {
  const src = read(`src/pages/${page}.tsx`);
  return /useNoIndex\(\)/.test(src) || /<SEO[^>]*\bnoindex\b/.test(src);
}

/** Does a public/_headers rule send X-Robots-Tag: noindex for this path? */
function headerNoIndex(routePath: string): boolean {
  const blocks = read("public/_headers").split(/\n(?=\/)/);
  const concrete = routePath.replace(/:\w+/g, "x");
  return blocks.some((block) => {
    const pattern = block.split("\n")[0].trim();
    if (!/X-Robots-Tag:\s*noindex/i.test(block)) return false;
    return pattern.endsWith("/*") ? concrete.startsWith(pattern.slice(0, -1)) : pattern === concrete;
  });
}

/** <loc> entries in the sitemap. */
function sitemapUrls(): string[] {
  return [...read("public/sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe("website SEO consistency", () => {
  const redirected = new Set([...hostRedirects(), ...clientRedirects()]);

  it("finds the inputs it checks", () => {
    expect(prerenderedPaths().length).toBeGreaterThan(5);
    expect(sitemapUrls().length).toBeGreaterThan(5);
    expect(redirected.has("/how-it-works")).toBe(true);
  });

  it("never prerenders a page for a URL that redirects", () => {
    expect(prerenderedPaths().filter((p) => redirected.has(p))).toEqual([]);
  });

  it("never lists a redirected URL in the sitemap", () => {
    const listed = sitemapUrls()
      .filter((url) => url.startsWith("https://pasalopalante.com/"))
      .map((url) => new URL(url).pathname.replace(/\/$/, "") || "/");
    expect(listed.filter((p) => redirected.has(p))).toEqual([]);
  });

  it("lists each URL once, as the exact canonical its page declares", () => {
    const urls = sitemapUrls();
    expect(new Set(urls).size).toBe(urls.length);
    const routes = routePages();
    const mismatches = urls.flatMap((url) => {
      const page = routes.get(new URL(url).pathname);
      if (!page) return [`${url}: no page route`];
      const canonical = declaredCanonical(page);
      return canonical === url ? [] : [`${url}: page declares ${canonical}`];
    });
    expect(mismatches).toEqual([]);
  });

  it("lists every prerendered page", () => {
    const listed = new Set(sitemapUrls());
    expect(prerenderedCanonicals().filter((url) => !listed.has(url))).toEqual([]);
  });

  it("keeps pages documented as unlisted out of the sitemap", () => {
    const listedPaths = sitemapUrls().map((url) => new URL(url).pathname);
    expect(listedPaths.filter((p) => UNLISTED.includes(p))).toEqual([]);
  });

  it("is a plain, well-formed urlset with absolute https URLs", () => {
    const xml = read("public/sitemap.xml");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length);
    expect(sitemapUrls().every((url) => /^https:\/\/[a-z.]+\//.test(url))).toBe(true);
  });

  it("is the sitemap robots.txt points crawlers to", () => {
    expect(read("public/robots.txt")).toMatch(/^Sitemap: https:\/\/pasalopalante\.com\/sitemap\.xml$/m);
  });

  it("keeps every utility route noindexed in the page and in the host header", () => {
    const routes = routePages();
    const problems = UTILITY_ROUTES.flatMap((route) => {
      const page = routes.get(route);
      if (!page) return [`${route}: no page route`];
      return [
        ...(pageIsNoIndex(page) ? [] : [`${route}: ${page} doesn't set noindex`]),
        ...(headerNoIndex(route) ? [] : [`${route}: no X-Robots-Tag rule in public/_headers`]),
      ];
    });
    expect(problems).toEqual([]);
    expect(pageIsNoIndex("NotFound")).toBe(true);
  });

  it("never blocks utility routes in robots.txt, so crawlers can see their noindex", () => {
    const disallowed = [...read("public/robots.txt").matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
    const blocked = UTILITY_ROUTES.filter((route) =>
      disallowed.some((rule) => route.replace(/:\w+/g, "x").startsWith(rule.replace(/\*$/, ""))),
    );
    expect(blocked).toEqual([]);
  });

  it("never lists a noindexed page in the sitemap", () => {
    const routes = routePages();
    const noindexed = sitemapUrls().filter((url) => {
      const page = routes.get(new URL(url).pathname);
      return page && pageIsNoIndex(page);
    });
    expect(noindexed).toEqual([]);
  });

  it("redirects /how-it-works to /programs, the page it always showed", () => {
    expect(read("public/_redirects")).toMatch(/^\/how-it-works\s+\/programs\s+301$/m);
    expect(read("src/App.tsx")).toMatch(/<Route path="\/how-it-works" element={<Navigate to="\/programs" replace \/>} \/>/);
  });
});
