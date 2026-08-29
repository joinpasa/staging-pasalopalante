// Cookie helpers scoped to the shared root domain so state set on
// pasalopalante.com (the website) is visible on app.pasalopalante.com (the
// installed app) and vice versa. Outside that production domain (localhost,
// preview hosts) cookies fall back to host-only scoping so local dev and
// previews keep working on their own origin.
const ROOT_DOMAIN = ".pasalopalante.com";

function isRootDomainHost(hostname: string): boolean {
  return hostname === "pasalopalante.com" || hostname.endsWith(".pasalopalante.com");
}

/** Exported for tests: the attribute string is what actually encodes the
 *  cross-subdomain scoping decision, independent of jsdom's cookie-jar
 *  same-origin enforcement. */
export function buildCookieAttributes(maxAgeSeconds?: number): string {
  const domain =
    typeof window !== "undefined" && isRootDomainHost(window.location.hostname)
      ? `; Domain=${ROOT_DOMAIN}`
      : "";
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  const age = maxAgeSeconds !== undefined ? `; Max-Age=${maxAgeSeconds}` : "";
  return `; Path=/${domain}${age}; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}${buildCookieAttributes(maxAgeSeconds)}`;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${buildCookieAttributes(0)}`;
}
