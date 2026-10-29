import { afterEach, describe, expect, it, vi } from "vitest";
import { getInstallPlatform } from "@shared/lib/installTrigger";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  windowsFirefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]",
};

function as(ua: string, maxTouchPoints = 0) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
  // jsdom has no maxTouchPoints at all — define it for this call.
  Object.defineProperty(window.navigator, "maxTouchPoints", { value: maxTouchPoints, configurable: true });
  return getInstallPlatform();
}

afterEach(() => vi.restoreAllMocks());

describe("getInstallPlatform", () => {
  it("sends every iPhone browser to Share → Add to Home Screen", () => {
    expect(as(UA.iphoneSafari)).toBe("ios");
    expect(as(UA.iphoneChrome)).toBe("ios");
  });

  it("recognizes an iPad that reports itself as a Mac", () => {
    expect(as(UA.macSafari, 5)).toBe("ios");
  });

  it("uses the browser menu route for every Android browser", () => {
    expect(as(UA.androidChrome)).toBe("android");
    expect(as(UA.androidFirefox)).toBe("android");
    expect(as(UA.androidSamsung)).toBe("android");
  });

  it("tells desktop browsers apart", () => {
    expect(as(UA.macSafari)).toBe("mac-safari");
    expect(as(UA.macChrome)).toBe("desktop");
    expect(as(UA.windowsEdge)).toBe("desktop");
    expect(as(UA.windowsFirefox)).toBe("unsupported");
  });

  it("catches browsers built into other apps before anything else", () => {
    expect(as(UA.instagramIos)).toBe("in-app");
    expect(as(UA.facebookAndroid)).toBe("in-app");
  });
});
