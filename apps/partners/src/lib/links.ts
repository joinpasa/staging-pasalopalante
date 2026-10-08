/** Same destinations the app's account menu uses (apps/app AccountMenu). */
export const REPORT_ISSUE_URL = "https://pasalopalante.com/tech-form";

/**
 * Public address of the portal. Invite links and QR codes always use it, so
 * opening the portal through another hostname (the workers.dev preview URL,
 * for example) never hands out a link on that hostname. Local dev keeps its
 * own origin so join links can be tested.
 */
export const PORTAL_ORIGIN = "https://partners.passkindnessforward.com";

export function publicOrigin() {
  const { hostname, origin } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1" ? origin : PORTAL_ORIGIN;
}
