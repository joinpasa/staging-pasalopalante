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

console.log("== 3/4: rescoping the embedded app's manifest to /app/ ==");
// The source file (apps/app/public/manifest.webmanifest) stays untouched —
// it's still correct as-is for the standalone app.pasalopalante.com build.
// Only this copy, going into the combined output, needs start_url/scope/
// icon paths rewritten from domain-root to /app/-relative.
const manifestPath = path.join(appDist, "manifest.webmanifest");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.start_url = "/app/";
manifest.scope = "/app/";
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
// The fallback target is a duplicate of index.html under a different name
// (not "/app/index.html" itself) — Cloudflare's _redirects validator
// treats a literal "index.html" destination as self-normalizing back to
// "/app/", which then re-matches this same /app/* rule and gets rejected
// at deploy time as an infinite loop. Same content, different filename
// sidesteps that special-casing entirely.
const appShellPath = path.join(embeddedAppDist, "app-shell.html");
fs.copyFileSync(path.join(embeddedAppDist, "index.html"), appShellPath);

const redirectsPath = path.join(websiteDist, "_redirects");
const existing = fs.existsSync(redirectsPath) ? fs.readFileSync(redirectsPath, "utf8").trimEnd() : "";
const appFallback = "/app/*  /app/app-shell.html  200";
fs.writeFileSync(redirectsPath, existing ? `${existing}\n${appFallback}\n` : `${appFallback}\n`);

console.log(`\nCombined build ready at ${websiteDist}`);
