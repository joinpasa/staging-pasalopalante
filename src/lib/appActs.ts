/** Short relative time labels for the app feeds ("2h ago", "Yesterday"). */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const TAG_EMOJI: Record<string, string> = {
  time: "⏳",
  hands_on: "🛠️",
  money: "💸",
  words: "💬",
  hug: "🤗",
  group: "👥",
};

/** A small glyph for an act, chosen from its tags then its mode. */
export function actEmoji(tags: string[], mode: string): string {
  for (const tag of tags) if (TAG_EMOJI[tag]) return TAG_EMOJI[tag];
  if (mode === "received") return "🎁";
  if (mode === "witnessed") return "👀";
  return "💛";
}

/** Human label for how the act reached the person logging it. */
export function modeLabel(mode: string): string {
  if (mode === "received") return "Received";
  if (mode === "witnessed") return "Saw";
  return "Did";
}
