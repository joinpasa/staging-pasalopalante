// Detects a pasted social-media post/profile link (Facebook, Instagram,
// TikTok, X/Twitter, YouTube) so the share flows can offer it as a linked
// post instead of swallowing it as plain description text. Matches by
// hostname rather than per-platform path regexes — share-sheet links come
// from all kinds of subdomains (m.facebook.com, vm.tiktok.com, l.facebook.com,
// fb.watch…) and a hostname check covers those without chasing each one.

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "x" | "youtube";

export interface DetectedSocialLink {
  platform: SocialPlatform;
  label: string;
  url: string;
}

const PLATFORMS: { platform: SocialPlatform; label: string; hosts: string[] }[] = [
  { platform: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { platform: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.watch"] },
  { platform: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { platform: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { platform: "x", label: "X", hosts: ["twitter.com", "x.com"] },
];

/**
 * Returns the matched platform when `value`, once trimmed, is nothing but a
 * single http(s) link to one of the supported platforms — not a sentence
 * that happens to contain a link. That's deliberate: this only fires for the
 * "pasted a bare share-sheet link" case; a link mixed into free text is left
 * alone as a normal description.
 */
export function detectSocialLink(value?: string | null): DetectedSocialLink | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  for (const p of PLATFORMS) {
    if (p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      return { platform: p.platform, label: p.label, url: trimmed };
    }
  }
  return null;
}
