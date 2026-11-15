// Tracked links: our own links with campaign tags on them, so a pledge can say which post, email
// or bio link brought it. The website keeps the tags when someone arrives and sends them with
// the pledge; Results then counts pledges by where they came from.

export const PLEDGE_PAGE = { en: "https://passkindnessforward.com/commit", es: "https://pasalopalante.com/commit" } as const;

/** "World Children's Day: what children teach us" → "world-childrens-day-what-children-teach-us" */
export const slug = (s: string, max = 48) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");

const OURS = /^https?:\/\/(www\.)?(passkindnessforward|pasalopalante)\.com(\/|$)/i;

/** Adds campaign tags to one of our own links. Other sites' links, and links already tagged, are left alone. */
export function tagged(url: string, tags: { source: string; medium: string; campaign?: string; content?: string }): string {
  if (!OURS.test(url) || /[?&]utm_/.test(url)) return url;
  const u = new URL(url);
  u.searchParams.set("utm_source", tags.source);
  u.searchParams.set("utm_medium", tags.medium);
  if (tags.campaign) u.searchParams.set("utm_campaign", tags.campaign);
  if (tags.content) u.searchParams.set("utm_content", tags.content);
  return u.toString();
}

/** What a source looks like in Results: "instagram, bio" → "Instagram bio link". */
export function sourceLabel(source: string, medium: string): string {
  const names: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", linkedin: "LinkedIn", youtube: "YouTube", pinterest: "Pinterest", newsletter: "Weekly email", whatsapp: "WhatsApp", partner: "A partner", "not tracked": "Not tracked" };
  const what: Record<string, string> = { bio: "bio link", social: "post", story: "story link", email: "", referral: "", partner: "" };
  const s = names[source] ?? source.replace(/^www\./, "");
  const m = medium in what ? what[medium] : medium;
  return m ? `${s} ${m}` : s;
}
