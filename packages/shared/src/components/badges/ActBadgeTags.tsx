import { useLanguage } from "@shared/contexts/LanguageContext";
import { useBadgeCatalogue } from "@shared/hooks/useBadgeCatalogue";
import { findActType } from "@shared/lib/actTypes";
import { badgesForAct, badgeText } from "@shared/lib/badges";
import { cn } from "@shared/lib/utils";

interface Props {
  mode: string | null;
  actType: string | null;
  /** Classes for the chip-tag pill, so each Wall can match its own look. */
  tagClassName?: string;
  className?: string;
}

/**
 * A Wall post's chip as a short tag ("Compliment", "Hug", ...) plus the icon
 * of every badge the act added +1 to. Shared by the app and website Walls so
 * both always agree on which badges an act counted toward.
 */
export default function ActBadgeTags({ mode, actType, tagClassName, className }: Props) {
  const { t, lang } = useLanguage();
  const { data: catalogue } = useBadgeCatalogue();
  const chip = findActType(actType);
  const badges = badgesForAct(catalogue, { mode, actType });

  if (!chip && badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chip && (
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tagClassName)}>
          {t.appLogAct[chip.labelKey]}
        </span>
      )}
      {badges.map((b) => (
        <span
          key={b.id}
          className="relative inline-flex h-7 w-7 items-center justify-center text-lg leading-none"
          title={`${badgeText(b, lang, "name")} +1`}
          aria-label={`${badgeText(b, lang, "name")} +1`}
        >
          <span aria-hidden="true">{b.icon || "🏅"}</span>
          <span
            aria-hidden="true"
            className="absolute -end-1.5 -top-1 rounded-full bg-white px-1 text-[9px] font-extrabold leading-tight text-neutral-800 shadow-sm"
          >
            +1
          </span>
        </span>
      ))}
    </div>
  );
}
