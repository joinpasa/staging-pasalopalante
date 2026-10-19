/**
 * Shared rate-limit helpers for every public, unauthenticated submission
 * endpoint (submit-act, submit-commitment, ppl-signup). Backed by one
 * generalized table/RPC (see the check_and_log_rate_limit migration)
 * instead of each function rolling its own log table the way
 * sign-photo-upload originally did — that earlier one-off is left as-is,
 * this is for everything after it.
 */

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return (
    req.headers.get("cf-connecting-ip") ||
    (fwd ? fwd.split(",")[0].trim() : null) ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function expandIPv6(ip: string): string[] {
  const addr = ip.replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const halves = addr.split("::");
  if (halves.length === 2) {
    const head = halves[0] ? halves[0].split(":") : [];
    const tail = halves[1] ? halves[1].split(":") : [];
    const missing = Math.max(8 - head.length - tail.length, 0);
    return [...head, ...new Array(missing).fill("0"), ...tail];
  }
  return addr.split(":");
}

/**
 * Rate-limit key for an IP: the address itself for IPv4, the /64 prefix
 * for IPv6 — a mobile carrier or ISP commonly hands a device a different
 * address within the same /64 on every request, so keying on the full
 * address would make the limit trivial to dodge.
 */
export function rateLimitIpKey(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  if (!ip.includes(":")) return ip;
  return expandIPv6(ip).slice(0, 4).join(":") + "::/64";
}

export function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** RATE_LIMIT_MULTIPLIER (default 1) — applied to per-IP limits only, so
 * an event can be widened via env var without a deploy. Per-email limits
 * are left alone on purpose: they're there to cap what one person can do,
 * not to absorb legitimate traffic spikes. */
export function rateLimitMultiplier(): number {
  return envInt("RATE_LIMIT_MULTIPLIER", 1);
}

interface RpcClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

export interface RateLimitOutcome {
  allowed: boolean;
  error: unknown;
  windowSeconds: number;
}

/** Thin wrapper around the check_and_log_rate_limit RPC. Never throws —
 * callers decide fail-open vs fail-closed from `error`. */
export async function checkRateLimit(
  supabase: RpcClient,
  bucket: string,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitOutcome> {
  const { data, error } = await supabase.rpc("check_and_log_rate_limit", {
    p_bucket: bucket,
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  return { allowed: data === true, error, windowSeconds };
}

export function rateLimitedResponse(windowSeconds: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "rate_limited", retry_after_seconds: windowSeconds }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
