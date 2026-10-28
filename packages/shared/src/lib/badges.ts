import { toast } from "sonner";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

/**
 * Badge rules live in the database (badges.criteria) — the same rules
 * act_badge_progress() uses to count and award. Reading them here, instead
 * of keeping a second copy in the frontend, is what lets the Wall show which
 * badges an act counted toward without the two ever drifting apart.
 */
export interface BadgeCriteria {
  type: "streak" | "acts";
  modes?: string[];
  act_types?: string[];
  stages: number[];
}

export interface BadgeDef {
  id: string;
  kind: string | null;
  sort_order: number | null;
  icon: string | null;
  name: string;
  name_es: string | null;
  name_fr: string | null;
  name_de: string | null;
  description: string | null;
  description_es: string | null;
  description_fr: string | null;
  description_de: string | null;
  criteria: BadgeCriteria | null;
}

export const BADGE_COLUMNS =
  "id, kind, sort_order, icon, name, name_es, name_fr, name_de, description, description_es, description_fr, description_de, criteria";

/** Badge name or description in the reader's language, English as fallback. */
export function badgeText(b: BadgeDef, lang: string, field: "name" | "description"): string {
  const map: Record<string, string | null | undefined> = {
    es: field === "name" ? b.name_es : b.description_es,
    fr: field === "name" ? b.name_fr : b.description_fr,
    de: field === "name" ? b.name_de : b.description_de,
  };
  return map[lang] || (field === "name" ? b.name : b.description) || "";
}

/** The badges this act added +1 to. Streaks aren't per act, so never listed. */
export function badgesForAct(
  catalogue: BadgeDef[] | undefined,
  act: { mode: string | null; actType: string | null },
): BadgeDef[] {
  return (catalogue ?? []).filter((b) => {
    const c = b.criteria;
    if (!c || c.type !== "acts") return false;
    if (c.modes && !c.modes.includes(act.mode ?? "")) return false;
    if (c.act_types && !c.act_types.includes(act.actType ?? "")) return false;
    return true;
  });
}

export async function fetchBadgeCatalogue(): Promise<BadgeDef[]> {
  const { data, error } = await supabasePublic
    .from("badges")
    .select(BADGE_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as BadgeDef[];
}

/**
 * Shows a message at the top of the screen for every badge that reached a
 * new stage with the act just submitted (submit-act's `badge_stages`).
 * `template` is t.appBadges.newStage, with {badge} and {stage}.
 */
export async function announceBadgeStages(
  stages: Array<{ badge_id: string; stage: number }> | undefined,
  lang: string,
  template: string,
) {
  if (!stages?.length) return;
  let catalogue: BadgeDef[] = [];
  try {
    catalogue = await fetchBadgeCatalogue();
  } catch (err) {
    console.error("badge catalogue fetch failed", err);
  }
  for (const s of stages) {
    const badge = catalogue.find((b) => b.id === s.badge_id);
    const name = badge ? badgeText(badge, lang, "name") : s.badge_id;
    toast.success(
      `${badge?.icon ?? "🏅"} ${template.replace("{badge}", name).replace("{stage}", String(s.stage))}`,
      { duration: 5000 },
    );
  }
}
