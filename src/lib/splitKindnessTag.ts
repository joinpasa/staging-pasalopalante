/**
 * Splits a kindness mode tag like "Kindness given" / "Bondad dada" / "Gentillesse vue"
 * into the leading noun ("Kindness") and the action word ("given"). Used so the
 * action word can be emphasized while the noun reads lighter.
 */
export function splitKindnessTag(label: string): { noun: string; action: string } {
  const trimmed = (label ?? "").trim();
  const idx = trimmed.indexOf(" ");
  if (idx < 0) return { noun: trimmed, action: "" };
  return { noun: trimmed.slice(0, idx), action: trimmed.slice(idx + 1) };
}
