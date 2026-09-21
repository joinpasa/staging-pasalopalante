import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCookie,
  setCookie,
  deleteCookie,
  buildCookieAttributes,
} from "@shared/lib/domainCookie";
import { domainAuthStorage } from "@shared/integrations/supabase/domainAuthStorage";

function clearAllCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
}

function mockLocation(hostname: string, protocol: "http:" | "https:") {
  const original = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...original, hostname, protocol },
  });
  return () => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  };
}

describe("buildCookieAttributes — cross-subdomain scoping", () => {
  let restore: () => void;
  afterEach(() => restore?.());

  it("scopes to .pasalopalante.com on the root domain", () => {
    restore = mockLocation("pasalopalante.com", "https:");
    expect(buildCookieAttributes(3600)).toContain("Domain=.pasalopalante.com");
  });

  it("scopes to .pasalopalante.com on the app subdomain", () => {
    restore = mockLocation("app.pasalopalante.com", "https:");
    expect(buildCookieAttributes(3600)).toContain("Domain=.pasalopalante.com");
  });

  it("does not scope the domain on localhost", () => {
    restore = mockLocation("localhost", "http:");
    expect(buildCookieAttributes(3600)).not.toContain("Domain=");
  });

  it("does not scope the domain on an unrelated host", () => {
    restore = mockLocation("example.com", "https:");
    expect(buildCookieAttributes(3600)).not.toContain("Domain=");
  });

  it("omits Secure over http", () => {
    restore = mockLocation("localhost", "http:");
    expect(buildCookieAttributes(3600)).not.toContain("Secure");
  });

  it("adds Secure over https", () => {
    restore = mockLocation("pasalopalante.com", "https:");
    expect(buildCookieAttributes(3600)).toContain("Secure");
  });
});

describe("domainCookie get/set/delete round-trip", () => {
  beforeEach(() => clearAllCookies());

  it("stores and retrieves a value", () => {
    setCookie("rt_key", "hello world", 3600);
    expect(getCookie("rt_key")).toBe("hello world");
  });

  it("returns undefined for a missing cookie", () => {
    expect(getCookie("nope")).toBeUndefined();
  });

  it("deletes a stored value", () => {
    setCookie("del_key", "bye", 3600);
    deleteCookie("del_key");
    expect(getCookie("del_key")).toBeUndefined();
  });

  it("round-trips values containing cookie-special characters", () => {
    const value = JSON.stringify({ a: "b;c=d", code: "x&y z" });
    setCookie("json_key", value, 3600);
    expect(getCookie("json_key")).toBe(value);
  });
});

describe("domainAuthStorage — Supabase session cookie adapter", () => {
  beforeEach(() => clearAllCookies());

  it("stores and retrieves a small session value in a single cookie", () => {
    domainAuthStorage.setItem("sb-test-auth-token", "small-session-value");
    expect(getCookie("sb-test-auth-token")).toBe("small-session-value");
    expect(domainAuthStorage.getItem("sb-test-auth-token")).toBe("small-session-value");
  });

  it("returns null for a key that was never set", () => {
    expect(domainAuthStorage.getItem("never-set")).toBeNull();
  });

  it("chunks and reassembles a value larger than one cookie", () => {
    // A real chunked value is always the (JSON) session object - a bare
    // repeated character isn't valid JSON, and getItem's reassembly now
    // validates that (see domainAuthStorage.ts) to catch a genuinely
    // corrupted chunk write, so the fixture here needs to be valid JSON too.
    const big = JSON.stringify({ token: "x".repeat(10000) });
    domainAuthStorage.setItem("sb-big-auth-token", big);
    // Should not fit in a single cookie under the key itself.
    expect(getCookie("sb-big-auth-token")).toBeUndefined();
    expect(getCookie("sb-big-auth-token.0")).toBeDefined();
    expect(getCookie("sb-big-auth-token.1")).toBeDefined();
    expect(domainAuthStorage.getItem("sb-big-auth-token")).toBe(big);
  });

  it("chunk boundaries account for percent-encoding expansion, not just raw length", () => {
    // JSON-heavy content (lots of {, }, ", :, ,) and unicode can expand
    // significantly once encodeURIComponent'd - a chunk sized by raw
    // character count alone could still overflow a real cookie's ~4093-byte
    // ceiling once encoded. Build content that's dense with exactly that
    // (repeated small JSON objects with an accented name) and confirm every
    // single chunk actually written stays under that real ceiling.
    const unit = JSON.stringify({ name: "María José Rodríguez-Peña", ok: true });
    const dense = JSON.stringify({ items: Array(40).fill(unit) });
    domainAuthStorage.setItem("sb-dense-auth-token", dense);
    const chunks = [];
    for (let i = 0; getCookie(`sb-dense-auth-token.${i}`) !== undefined; i++) {
      chunks.push(getCookie(`sb-dense-auth-token.${i}`)!);
    }
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(encodeURIComponent(chunk).length).toBeLessThanOrEqual(4093);
    }
    expect(domainAuthStorage.getItem("sb-dense-auth-token")).toBe(dense);
  });

  it("returns null (not corrupted data) when a chunk is missing, instead of throwing", () => {
    const value = JSON.stringify({ token: "y".repeat(10000) });
    domainAuthStorage.setItem("sb-partial-auth-token", value);
    // Simulate a chunk write that silently failed by deleting one piece.
    deleteCookie("sb-partial-auth-token.1");
    expect(domainAuthStorage.getItem("sb-partial-auth-token")).toBeNull();
  });

  it("removes both single-cookie and chunked forms", () => {
    domainAuthStorage.setItem("sb-small", "v");
    domainAuthStorage.setItem("sb-big", "y".repeat(10000));
    domainAuthStorage.removeItem("sb-small");
    domainAuthStorage.removeItem("sb-big");
    expect(domainAuthStorage.getItem("sb-small")).toBeNull();
    expect(domainAuthStorage.getItem("sb-big")).toBeNull();
    expect(getCookie("sb-big.0")).toBeUndefined();
  });

  it("overwriting a chunked value with a smaller one clears stale trailing chunks", () => {
    domainAuthStorage.setItem("sb-shrink", "z".repeat(10000));
    domainAuthStorage.setItem("sb-shrink", "small");
    expect(domainAuthStorage.getItem("sb-shrink")).toBe("small");
    expect(getCookie("sb-shrink.1")).toBeUndefined();
  });
});

describe("cross-subdomain simulation", () => {
  it("a session cookie written on pasalopalante.com is requested with a domain that also covers app.pasalopalante.com", () => {
    // We can't spin up two real origins in one jsdom document, so this
    // verifies the actual browser-facing contract: the cookie attribute
    // string asks for .pasalopalante.com, which per RFC 6265 is visible to
    // any host that is pasalopalante.com or a subdomain of it — including
    // app.pasalopalante.com. Real cross-origin sharing is standard browser
    // behavior once this attribute is correct; it isn't something a single
    // jsdom document can exercise directly.
    const restore = mockLocation("pasalopalante.com", "https:");
    try {
      const attrs = buildCookieAttributes(3600);
      expect(attrs).toContain("Domain=.pasalopalante.com");
      const domainValue = /Domain=([^;]+)/.exec(attrs)?.[1];
      expect("app.pasalopalante.com".endsWith(domainValue!.replace(/^\./, ""))).toBe(true);
    } finally {
      restore();
    }
  });
});
