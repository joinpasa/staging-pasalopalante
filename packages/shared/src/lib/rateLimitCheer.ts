/**
 * Shared handling for the 429 rate-limit response from submit-act,
 * submit-commitment and ppl-signup (see supabase/functions/_shared/rateLimit.ts).
 *
 * supabase-js's FunctionsHttpError.context is the raw, unparsed Response
 * object (see @supabase/functions-js' FunctionsClient), not the parsed JSON
 * body — so checking its status code is simpler and more robust than trying
 * to read a body field off it.
 */
export function isRateLimitedError(error: unknown): boolean {
  const context = (error as { context?: unknown } | null | undefined)?.context;
  return typeof Response !== "undefined" && context instanceof Response && context.status === 429;
}

const CHEER_EN = [
  "You're on a roll! You've logged a lot of kindness in a short time — take a breather and try again in a few minutes.",
  "Whoa, kindness overload! Give it a few minutes before your next one.",
  "You're moving fast! Take a quick breather, then try again shortly.",
  "That's a lot of good vibes in a row — pause for a few minutes and try again.",
  "Kindness coming in hot! Slow down for a few minutes and try again.",
];

const CHEER_ES = [
  "¡Vas con todo! Has registrado mucha bondad en poco tiempo — toma un respiro e intenta de nuevo en unos minutos.",
  "¡Sobrecarga de bondad! Espera unos minutos antes de tu próximo acto.",
  "¡Vas muy rápido! Respira un momento e intenta de nuevo en breve.",
  "¡Eso es mucha buena vibra de una vez! Pausa unos minutos e intenta de nuevo.",
  "¡La bondad está que arde! Baja el ritmo unos minutos e intenta de nuevo.",
];

/** Picks one of 5 random cheer phrases — es for Spanish, en for everything else. */
export function pickRateLimitCheer(lang?: string): string {
  const pool = lang === "es" ? CHEER_ES : CHEER_EN;
  return pool[Math.floor(Math.random() * pool.length)];
}
