declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      onChatMinimized?: () => void;
      maximize?: () => void;
      showWidget?: () => void;
      hideWidget?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

const WIDGET_SRC = "https://embed.tawk.to/6ab43cfae84b8134496f22b1/1k380sct8";

/**
 * Opens the Tawk.to live-chat widget for "Get Support" in the account menu.
 * Loaded lazily (only on first tap) rather than at app startup — Tawk's
 * default embed shows its own floating bubble the moment it loads, which
 * would sit on top of this app's own bottom nav on every single screen.
 * Loading it on demand and maximizing it as soon as it's ready keeps it
 * fully out of the way until someone actually asks for support.
 *
 * hideWidget() on minimize is the important part: Tawk's own in-chat X
 * only collapses the conversation panel back down to its launcher bubble —
 * that bubble is otherwise permanent once the widget has loaded, with no
 * way to actually dismiss it, and it was sitting right on top of the
 * bottom nav's rightmost tab. Hiding the widget the moment they close the
 * chat removes it completely instead, back to nothing on screen until
 * "Get Support" is tapped again.
 */
export function openSupportChat() {
  if (window.Tawk_API?.maximize) {
    window.Tawk_API.showWidget?.();
    window.Tawk_API.maximize();
    return;
  }

  window.Tawk_LoadStart = new Date();
  window.Tawk_API = window.Tawk_API ?? {};
  window.Tawk_API.onLoad = () => window.Tawk_API?.maximize?.();
  window.Tawk_API.onChatMinimized = () => window.Tawk_API?.hideWidget?.();

  const script = document.createElement("script");
  script.async = true;
  script.src = WIDGET_SRC;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  document.body.appendChild(script);
}
