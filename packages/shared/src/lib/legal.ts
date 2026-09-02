// Shared helpers for legal-document version tracking & consent capture.
import { supabase } from "@shared/integrations/supabase/client";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

export type DocKey = "terms" | "privacy" | "community_guidelines";

export interface LegalVersions {
  terms: { version: string; major: number };
  privacy: { version: string; major: number };
  community_guidelines: { version: string; major: number };
}

const FALLBACK: LegalVersions = {
  terms: { version: "1.0", major: 1 },
  privacy: { version: "3.0", major: 3 },
  community_guidelines: { version: "1.0", major: 1 },
};

let cached: Promise<LegalVersions> | null = null;

export function fetchLegalVersions(): Promise<LegalVersions> {
  if (cached) return cached;
  cached = (async () => {
    try {
      const { data, error } = await supabasePublic
        .from("legal_document_versions")
        .select("doc_key, version, major");
      if (error || !data) return FALLBACK;
      const out = { ...FALLBACK };
      for (const row of data as Array<{ doc_key: string; version: string; major: number }>) {
        if (row.doc_key === "terms" || row.doc_key === "privacy" || row.doc_key === "community_guidelines") {
          out[row.doc_key] = { version: row.version, major: row.major };
        }
      }
      return out;
    } catch {
      return FALLBACK;
    }
  })();
  return cached;
}

/** Best-effort client IP. Browser cannot read it directly; we ping ipify.
 *  Capped at 3s — this is a third-party service with no SLA, and callers
 *  (submission flows in particular) must never hang waiting on it. */
export async function fetchClientIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { ip?: string };
    return j.ip ?? null;
  } catch {
    return null;
  }
}

interface ConsentRecord {
  user_id?: string | null;
  context: "signup" | "reconsent" | "anon_act" | "auth_magic";
  act_id?: string | null;
  email_reminders_opt_in?: boolean;
  email?: string | null;
}

export async function logConsent(input: ConsentRecord) {
  const [versions, ip] = await Promise.all([fetchLegalVersions(), fetchClientIp()]);
  return supabase.from("user_consents").insert({
    user_id: input.user_id ?? null,
    context: input.context,
    act_id: input.act_id ?? null,
    terms_version: versions.terms.version,
    privacy_version: versions.privacy.version,
    community_guidelines_version: versions.community_guidelines.version,
    email_reminders_opt_in: !!input.email_reminders_opt_in,
    ip_address: ip,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    email: input.email ?? null,
  });
}
