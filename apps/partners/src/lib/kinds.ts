import type { Lang } from "./i18n";

/**
 * The three kinds of member in the Partners Hub (25 Nov 2026). Each gets its own kit, wording and
 * colour; the database stores the finer org_type (school, ngo, company, ambassador…).
 */
export type Kind = "organisation" | "company" | "ambassador";

export const KINDS: Kind[] = ["organisation", "company", "ambassador"];

export function kindOf(orgType: string | null | undefined): Kind {
  if (orgType === "company") return "company";
  if (orgType === "ambassador") return "ambassador";
  return "organisation";
}

/** One colour per kind, used for chips, map markers and avatars. */
export const KIND_COLOR: Record<Kind, string> = {
  organisation: "#00a3e0",
  company: "#d81b60",
  ambassador: "#fdb813",
};

export const KIND_TINT: Record<Kind, string> = {
  organisation: "#e6f6fc",
  company: "#fbe9f0",
  ambassador: "#fff3d1",
};

const KIND_LABEL: Record<Lang, Record<Kind, [string, string]>> = {
  en: { organisation: ["Organisation", "Organisations"], company: ["Company", "Companies"], ambassador: ["Ambassador", "Ambassadors"] },
  es: { organisation: ["Organización", "Organizaciones"], company: ["Empresa", "Empresas"], ambassador: ["Embajador/a", "Embajadores"] },
};

export function kindLabel(kind: Kind, lang: Lang, plural = false) {
  return KIND_LABEL[lang][kind][plural ? 1 : 0];
}

export const ORG_TYPES = ["school", "ngo", "faith", "government", "community", "other", "company", "ambassador"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

const ORG_TYPE_LABEL: Record<Lang, Record<OrgType, string>> = {
  en: {
    school: "School",
    ngo: "Nonprofit",
    faith: "Faith group",
    government: "Government",
    community: "Community group",
    other: "Other organisation",
    company: "Company",
    ambassador: "Ambassador",
  },
  es: {
    school: "Escuela",
    ngo: "Sin fines de lucro",
    faith: "Grupo de fe",
    government: "Gobierno",
    community: "Grupo comunitario",
    other: "Otra organización",
    company: "Empresa",
    ambassador: "Embajador/a",
  },
};

export function orgTypeLabel(orgType: string | null | undefined, lang: Lang) {
  if (!orgType) return KIND_LABEL[lang].organisation[0];
  return ORG_TYPE_LABEL[lang][orgType as OrgType] ?? orgType;
}

/** Org types a member of this kind may pick on their profile. */
export function orgTypesFor(kind: Kind): OrgType[] {
  if (kind === "company") return ["company"];
  if (kind === "ambassador") return ["ambassador"];
  return ["school", "ngo", "faith", "government", "community", "other"];
}

/** Which kit items a member of this kind sees. */
export function kitAudienceMatches(audience: string, kind: Kind) {
  return audience === "all" || audience === kind;
}
