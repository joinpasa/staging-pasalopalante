import { describe, it, expect, afterEach } from "vitest";
import { isSatelliteDomain, getAppBaseUrl } from "@shared/lib/canonicalDomain";

function mockLocation(hostname: string) {
  const original = window.location;
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...original, hostname },
  });
  return () => {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  };
}

describe("isSatelliteDomain", () => {
  it("is false on the canonical domain", () => {
    expect(isSatelliteDomain("pasalopalante.com")).toBe(false);
  });

  it("is false on www of the canonical domain", () => {
    expect(isSatelliteDomain("www.pasalopalante.com")).toBe(false);
  });

  it("is false on the app subdomain — that IS the canonical app property", () => {
    // Regression test: an earlier version of this check used an enumerated
    // set of exact hostnames that didn't include app.pasalopalante.com.
    // CanonicalAppDomainGate is mounted in every build of the app,
    // including the real standalone app.pasalopalante.com — with that bug,
    // it treated its own production domain as a satellite and called
    // location.replace() to its own URL on every navigation, breaking
    // login and QR sharing on the live app. Must never regress.
    expect(isSatelliteDomain("app.pasalopalante.com")).toBe(false);
  });

  it("is false on any other pasalopalante.com subdomain, present or future", () => {
    expect(isSatelliteDomain("staging.pasalopalante.com")).toBe(false);
    expect(isSatelliteDomain("beta.pasalopalante.com")).toBe(false);
  });

  it("is true on a co-brand marketing domain", () => {
    expect(isSatelliteDomain("passkindnessforward.com")).toBe(true);
  });

  it("is true on www of a co-brand marketing domain", () => {
    expect(isSatelliteDomain("www.passkindnessforward.com")).toBe(true);
  });

  it("is false on localhost (dev)", () => {
    expect(isSatelliteDomain("localhost")).toBe(false);
  });

  it("is false on a Cloudflare Pages preview host", () => {
    expect(isSatelliteDomain("abc123.stagingsite-pasalopalante.pages.dev")).toBe(false);
  });

  it("defaults to reading the current window.location.hostname", () => {
    const restore = mockLocation("passkindnessforward.com");
    try {
      expect(isSatelliteDomain()).toBe(true);
    } finally {
      restore();
    }
  });
});

describe("getAppBaseUrl", () => {
  afterEach(() => {
    // no-op; each test restores its own mock
  });

  it("forces the canonical cross-origin app URL on a satellite domain, regardless of the build-time constant", () => {
    const restore = mockLocation("passkindnessforward.com");
    try {
      expect(getAppBaseUrl()).toBe("https://app.pasalopalante.com/");
    } finally {
      restore();
    }
  });

  it("forces the canonical cross-origin app URL on www of a satellite domain too", () => {
    const restore = mockLocation("www.passkindnessforward.com");
    try {
      expect(getAppBaseUrl()).toBe("https://app.pasalopalante.com/");
    } finally {
      restore();
    }
  });

  it("falls through to the build-time constant on the canonical domain", () => {
    const restore = mockLocation("pasalopalante.com");
    try {
      // __APP_BASE_URL__ is injected by vite's `define`; under vitest it's
      // whatever packages/shared/vitest.config.ts sets it to (or undefined
      // if unset) — this asserts getAppBaseUrl() passes that value through
      // unmodified on the canonical domain, not that it equals any
      // particular string.
      expect(getAppBaseUrl()).toBe(__APP_BASE_URL__);
    } finally {
      restore();
    }
  });
});
