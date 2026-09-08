/// <reference types="vite/client" />

/** Injected per-app via each app's vite.config.ts `define` — see there for why. */
declare const __CANONICAL_ORIGIN__: string;

/**
 * Where the website's "Get the app" link should point. Defaults to the
 * app's own subdomain (cross-origin, today's live setup); the combined
 * build (scripts/build-combined.mjs) overrides this to a same-origin
 * relative path when the app is embedded under /app on this deployment.
 * Only meaningful for apps/website's build — apps/app defines it too
 * (unused there) purely so this shared component still compiles.
 */
declare const __APP_BASE_URL__: string;
