import { useState } from "react";
import { Heart, Loader2, ExternalLink } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { useActTranslation } from "@/hooks/useActTranslation";
import { SOCIAL_LINK_ICONS } from "@shared/components/share/SocialLinkChip";
import type { DetectedSocialLink } from "@shared/lib/socialLinks";

interface Props {
  id: string;
  description: string | null;
  firstName: string | null;
  language: string | null;
  reactionCount: number;
  reacted: boolean;
  anonymousLabel: string;
  onToggleReact: () => void;
  socialLink?: DetectedSocialLink | null;
}

export default function WallDialogBody({
  id,
  description,
  firstName,
  language,
  reactionCount,
  reacted,
  anonymousLabel,
  onToggleReact,
  socialLink,
}: Props) {
  const { t, lang } = useLanguage();
  const original = (description ?? "").trim();
  const { translation, loading, needed, sourceLang } = useActTranslation(
    id,
    original,
    language,
    lang,
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const display = needed && translation && !showOriginal ? translation : original;

  const translatedLabel =
    sourceLang === "en"
      ? t.inspiration.translatedFromEn
      : sourceLang === "es"
      ? t.inspiration.translatedFromEs
      : "";

  return (
    <div className="p-8 overflow-y-auto" style={{ color: "hsl(20 35% 18%)" }}>
      {original && (
        <p
          className="font-bold text-lg leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
        >
          {`"${display}"`}
        </p>
      )}
      {needed && (
        <div className="mt-3 text-xs" style={{ color: "hsl(20 25% 30%)" }}>
          {loading && !translation ? (
            <span className="inline-flex items-center gap-1 italic">
              <Loader2 size={12} className="animate-spin" />
              {t.inspiration.translating}
            </span>
          ) : translation ? (
            <>
              <span className="italic">{translatedLabel}</span>
              {" · "}
              <button
                type="button"
                onClick={() => setShowOriginal((v) => !v)}
                className="underline underline-offset-2 hover:opacity-70 transition-opacity font-semibold"
              >
                {showOriginal ? t.inspiration.seeTranslation : t.inspiration.seeOriginal}
              </button>
            </>
          ) : null}
        </div>
      )}
      {socialLink && (() => {
        const SocialIcon = SOCIAL_LINK_ICONS[socialLink.platform];
        return (
          <a
            href={socialLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ borderColor: "hsl(20 35% 18% / 0.15)", color: "hsl(20 35% 18%)" }}
          >
            <SocialIcon size={16} />
            View the original post on {socialLink.label}
            <ExternalLink size={14} />
          </a>
        );
      })()}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: "hsl(20 25% 30%)" }}>
          — {firstName || anonymousLabel}
        </span>
        <button
          onClick={onToggleReact}
          aria-label="Heart"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: "hsl(20 35% 18%)" }}
        >
          <Heart size={18} className={reacted ? "fill-current" : ""} />
          {reactionCount}
        </button>
      </div>
    </div>
  );
}
