import { supabase } from "@shared/integrations/supabase/client";

export type GhlLifecycleTag = "password-set" | "email-verified" | "website-signup";

/**
 * Fire-and-forget: tag a contact in GoHighLevel for a lifecycle milestone
 * (password set, email verified) so GHL automations can key off it. Never
 * throws — a failed CRM sync must not interrupt the user-facing action that
 * triggered it (setting a password, landing on a verified session).
 */
export function syncGhlTag(
  email: string | null | undefined,
  tag: GhlLifecycleTag,
  name?: { firstName?: string | null; lastName?: string | null },
  source?: "PPL Website" | "PPL App",
): void {
  if (!email) return;
  supabase.functions
    .invoke("ppl-signup", {
      body: {
        formType: tag,
        data: {
          email,
          firstName: name?.firstName || "",
          lastName: name?.lastName || "",
          source,
        },
      },
    })
    .catch((e) => console.error(`GHL ${tag} sync failed (non-fatal)`, e));
}
