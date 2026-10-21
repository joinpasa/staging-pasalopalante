// Lazy-loads each platform's official embed SDK exactly once per page
// session (idempotent — safe to call from every card that needs it), and
// re-exposes each library's "scan for new markup" call, since React mounts
// embed divs/blockquotes after each SDK's own initial page-load parse.
// Used on /media for Facebook, Instagram, and X posts/reels/videos.

declare global {
  interface Window {
    FB?: { XFBML: { parse: (node?: HTMLElement) => void } };
    instgrm?: { Embeds: { process: () => void } };
    twttr?: { widgets: { load: (node?: HTMLElement) => void } };
  }
}

const loaded: Record<string, Promise<void>> = {};

function loadScriptOnce(id: string, src: string): Promise<void> {
  if (!loaded[id]) {
    loaded[id] = new Promise((resolve) => {
      if (document.getElementById(id)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      // Fail open: if the SDK can't load (ad blocker, offline, etc.) the
      // card's markup just sits there unrendered rather than the page
      // breaking — resolve either way so callers don't hang.
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });
  }
  return loaded[id];
}

export function loadFacebookSdk(): Promise<void> {
  if (!document.getElementById("fb-root")) {
    const root = document.createElement("div");
    root.id = "fb-root";
    document.body.prepend(root);
  }
  return loadScriptOnce("facebook-jssdk", "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0");
}

export function loadInstagramEmbed(): Promise<void> {
  return loadScriptOnce("instagram-embed-js", "https://www.instagram.com/embed.js");
}

export function loadTwitterWidgets(): Promise<void> {
  return loadScriptOnce("twitter-widgets-js", "https://platform.twitter.com/widgets.js");
}
