import type { Lever } from "./types";

/**
 * The kinds of growth work, each with a colour and one line on why it grows reach.
 * The colour always sits next to the name, so it never carries meaning on its own.
 */
export const LEVERS: Record<Lever, { label: string; dot: string; why: string }> = {
  post: { label: "Publish", dot: "bg-navy", why: "A steady post every day keeps the accounts in people's feeds." },
  engage: { label: "Engage", dot: "bg-rose", why: "Replies and comments tell the platforms a post is worth showing to more people." },
  trend: { label: "Trends", dot: "bg-orange", why: "Joining a rising format early puts us in front of people who do not follow us yet." },
  partners: { label: "Partners", dot: "bg-sky", why: "Partners and ambassadors reach audiences our own accounts never will." },
  collab: { label: "Collabs", dot: "bg-sun", why: "A collab post appears on both accounts, so every follower of the partner sees it too." },
  email: { label: "Email", dot: "bg-sky-ink", why: "Email reaches people who pledged, whatever the feeds decide." },
  website: { label: "Website", dot: "bg-ink-muted", why: "When search and shared links work, every post sends people somewhere that converts." },
  review: { label: "Review", dot: "bg-ink-faint", why: "Looking at what worked decides what to make more of." },
};

export const LEVER_ORDER: Lever[] = ["post", "engage", "trend", "partners", "collab", "email", "website", "review"];
