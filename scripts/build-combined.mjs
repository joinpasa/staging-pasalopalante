#!/usr/bin/env node
// Builds a single combined deployment: the website at "/" and the app
// embedded at "/app/*", both served from the one origin this runs under.
//
// This is additive — it does NOT change what `npm run build:website` or
// `npm run build:app` produce on their own, so the two currently-live,
// independently-deployed Cloudflare projects (pasalopalante.com and
// app.pasalopalante.com) are unaffected by this file's existence. A
// Cloudflare project only produces this combined output if its build
// command is explicitly changed to `npm run build:combined` — see
// CLAUDE.md for the cutover steps.
//
// Why the app needs its own build here rather than reusing apps/app/dist:
// it has to be built with --base=/app/ so its asset URLs, manifest link,
// and router basename all resolve under that path instead of domain root.

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const websiteDist = path.join(root, "apps/website/dist");
const appDist = path.join(root, "apps/app/dist");
const embeddedAppDist = path.join(websiteDist, "app");

function run(command, env = {}) {
  console.log(`$ ${command}`);
  execSync(command, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
}

console.log("== 1/4: building the app with --base=/app/ ==");
run("npm run build --workspace=@pasalopalante/app -- --base=/app/");

console.log("== 2/4: building the website (app embedded at /app/) ==");
// Tells InstallPrompt's "Get the app" link to navigate same-origin to
// /app/ instead of the cross-origin app.pasalopalante.com default.
run("npm run build --workspace=@pasalopalante/website", { APP_BASE_URL: "/app/" });

console.log("== 3/4: rescoping the embedded app's manifest to the whole origin ==");
// The source file (apps/app/public/manifest.webmanifest) stays untouched —
// it's still correct as-is for the standalone app.pasalopalante.com build.
// Only this copy, going into the combined output, needs rewriting: icon
// paths and start_url move under /app/ (that's still where the installed
// icon actually opens to), but scope widens to "/" — the whole origin,
// not just /app/* — so the browser considers the marketing pages
// installable too, and beforeinstallprompt can fire there directly
// instead of only once someone has already navigated into /app/.
// Explicit id, rather than leaving Chrome to infer identity from
// start_url — Chrome's own DevTools Manifest panel flags this directly
// ("id is not specified... set the id field to /app/ to specify an App ID
// that matches the current identity"). Without it, an install triggered
// from a page whose own URL isn't /app/ (any marketing page, now that
// they're all installable too) has been observed launching to that page
// instead of start_url — a pinned id removes the ambiguity.
const manifestPath = path.join(appDist, "manifest.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.id = "/app/";
manifest.start_url = "/app/";
manifest.scope = "/";
manifest.icons = (manifest.icons ?? []).map((icon) => ({
  ...icon,
  src: icon.src.startsWith("/") ? `/app${icon.src}` : icon.src,
}));
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log("== 4/4: assembling the combined output ==");
fs.rmSync(embeddedAppDist, { recursive: true, force: true });
fs.cpSync(appDist, embeddedAppDist, { recursive: true });

// The app's own client-side routes (/app/wall, /app/pass, ...) have no
// matching file on disk, so they need an explicit SPA-fallback rule.
// Cloudflare's native `not_found_handling` (set in wrangler.toml) only
// covers the top-level dist/index.html, not this nested one — hence a
// _redirects rule instead, appended to whatever the website already ships
// (e.g. the /tech-form redirect) rather than overwriting it.
//
// The fallback target is a duplicate of index.html with NO .html
// extension at all (not just a different name) — Cloudflare's static
// asset server auto-redirects .html-suffixed paths to their
// extension-less form by default, and that redirect re-matches a wildcard
// /app/* rule, which serves the .html file again, which redirects again —
// an actual runtime loop (ERR_TOO_MANY_REDIRECTS), not just something
// Cloudflare's deploy-time validator was overcautious about. An
// extension-less file has nothing for that feature to normalize, so a
// _headers rule sets its Content-Type explicitly since Cloudflare can't
// infer it from the (absent) extension.
const appShellPath = path.join(embeddedAppDist, "app-shell");
fs.copyFileSync(path.join(embeddedAppDist, "index.html"), appShellPath);

// A /app/* wildcard also turned out to shadow real files under /app/ —
// including the app's own JS/CSS bundles — with the fallback shell, since
// Cloudflare doesn't reliably prefer an existing file over a matching
// _redirects rule the way this setup needs. Listing the app's actual
// client-side routes explicitly (from apps/app/src/App.tsx) instead of a
// wildcard means only genuinely missing paths ever hit the fallback; a
// real file always wins because there's no broader pattern to shadow it
// with. Keep this in sync with that route list.
const APP_ROUTES = ["wall", "pass", "map", "badges", "join", "log", "wave", "account"];
const appFallbackRules = APP_ROUTES.map((route) => `/app/${route}  /app/app-shell  200`).join("\n");

const redirectsPath = path.join(websiteDist, "_redirects");
const existing = fs.existsSync(redirectsPath) ? fs.readFileSync(redirectsPath, "utf8").trimEnd() : "";
fs.writeFileSync(redirectsPath, existing ? `${existing}\n${appFallbackRules}\n` : `${appFallbackRules}\n`);

console.log("== making the marketing pages installable too ==");
// A service worker registered from a script at /app/push-sw.js can only
// control /app/* by default — a script can't grant itself a wider scope
// than its own directory. Service-Worker-Allowed lifts that ceiling to
// the whole origin, so the website (which has no service worker of its
// own) can register this same script with scope "/" and have
// beforeinstallprompt fire on its own pages, not just under /app/.
const headersPath = path.join(websiteDist, "_headers");
const existingHeaders = fs.existsSync(headersPath) ? fs.readFileSync(headersPath, "utf8").trimEnd() : "";
const appShellHeader = "/app/app-shell\n  Content-Type: text/html; charset=utf-8\n";
const swHeader = "/app/push-sw.js\n  Service-Worker-Allowed: /\n";
fs.writeFileSync(
  headersPath,
  existingHeaders ? `${existingHeaders}\n${appShellHeader}\n${swHeader}` : `${appShellHeader}\n${swHeader}`,
);

// Every website page needs a <link rel="manifest"> so the browser
// considers it part of the (now origin-wide) installable app — without
// this, beforeinstallprompt still only fires under /app/*, same as
// before. Standalone (non-combined) builds don't have this file at all,
// so this same link there just 404s harmlessly — browsers silently skip
// installability when the manifest fetch fails, which is exactly
// today's (unaffected) standalone behavior.
function findHtmlFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === embeddedAppDist) continue; // the app has its own correct manifest link already
      found.push(...findHtmlFiles(full));
    } else if (entry.name.endsWith(".html")) {
      found.push(full);
    }
  }
  return found;
}

const manifestLink = '<link rel="manifest" href="/app/manifest.webmanifest" />';
const htmlFiles = findHtmlFiles(websiteDist);
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes(manifestLink)) continue;
  fs.writeFileSync(file, html.replace("</head>", `    ${manifestLink}\n  </head>`));
}
console.log(`Injected manifest link into ${htmlFiles.length} website page(s).`);

console.log(`\nCombined build ready at ${websiteDist}`);
