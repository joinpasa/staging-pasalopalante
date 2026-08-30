export const DISPLAY_NAME_RE = /^[\p{L}\p{N} .\-'_]{2,30}$/u;

const RESERVED = ["pasalo", "pásalo", "palante", "pa'lante", "admin", "moderator", "support", "official"];

export function isReservedDisplayName(v: string) {
  const low = v.toLowerCase();
  return RESERVED.some((r) => low.includes(r));
}
