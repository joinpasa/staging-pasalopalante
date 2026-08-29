import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  captureReferralFromUrl,
  getStoredReferral,
  clearStoredReferral,
  withReferral,
} from "@shared/lib/referral";
import { setCookie, getCookie } from "@shared/lib/domainCookie";

function clearAllCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
}

function setLocation(pathname: string, search: string) {
  const url = new URL(`${window.location.origin}${pathname}${search}`);
  window.history.pushState({}, "", url.toString());
}

describe("referral cookie storage", () => {
  beforeEach(() => {
    clearAllCookies();
    setLocation("/wave/abc123", "");
  });
  afterEach(() => vi.useRealTimers());

  it("captures ?r= from the URL, stores it, and strips it from the address bar", () => {
    setLocation("/wave/abc123", "?r=inviter-code");
    captureReferralFromUrl();
    expect(getStoredReferral()).toBe("inviter-code");
    expect(window.location.search).toBe("");
  });

  it("is readable via the low-level cookie API too, proving it's not localStorage-backed", () => {
    setLocation("/wave/abc123", "?r=cross-domain-code");
    captureReferralFromUrl();
    const raw = getCookie("ppl_ref");
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).code).toBe("cross-domain-code");
    // Confirms nothing was written to localStorage for this key.
    expect(window.localStorage.getItem("ppl_ref")).toBeNull();
  });

  it("returns null when nothing was captured", () => {
    expect(getStoredReferral()).toBeNull();
  });

  it("expires a stored code after the 7-day TTL", () => {
    const expiredPayload = JSON.stringify({
      code: "stale-code",
      ts: Date.now() - 8 * 24 * 60 * 60 * 1000,
    });
    setCookie("ppl_ref", expiredPayload, 7 * 24 * 60 * 60);
    expect(getStoredReferral()).toBeNull();
  });

  it("clearStoredReferral removes it", () => {
    setLocation("/wave/abc123", "?r=to-be-cleared");
    captureReferralFromUrl();
    expect(getStoredReferral()).toBe("to-be-cleared");
    clearStoredReferral();
    expect(getStoredReferral()).toBeNull();
  });

  it("simulates a website-referral-to-app-signup handoff: the code survives being read from a fresh module-level call as if on a different subdomain page load", () => {
    setLocation("/wave/xyz", "?r=handoff-code");
    captureReferralFromUrl();
    // Simulate navigating away and a new page (e.g. app.pasalopalante.com/join)
    // reading the same cookie jar — jsdom shares one document, but this is
    // the same read path AuthContext uses after a fresh signup on the app.
    const codeSeenOnAppSignup = getStoredReferral();
    expect(codeSeenOnAppSignup).toBe("handoff-code");
  });
});

describe("withReferral", () => {
  it("appends the referral code as ?r= on a URL", () => {
    expect(withReferral("https://pasalopalante.com/wave/1", "abc")).toBe(
      "https://pasalopalante.com/wave/1?r=abc",
    );
  });

  it("returns the URL unchanged when no code is given", () => {
    expect(withReferral("https://pasalopalante.com/wave/1", null)).toBe(
      "https://pasalopalante.com/wave/1",
    );
  });
});
