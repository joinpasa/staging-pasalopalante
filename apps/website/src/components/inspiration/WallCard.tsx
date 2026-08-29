import { useState } from "react";
import { Heart, Play, Loader2 } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { pickCardGradient } from "@shared/lib/cardGradients";
import { useActTranslation } from "@/hooks/useActTranslation";
import PalanteArrow from "@shared/components/icons/PalanteArrow";
import { splitKindnessTag } from "@shared/lib/splitKindnessTag";


export type WallMode = "performed" | "received" | "witnessed";

interface Props {
  id: string;
  description: string | null;
  firstName: string | null;
  mode: WallMode;
  language: string | null;
  photoUrl: string | null;
  videoThumbUrl: string | null;
  reactionCount: number;
  reacted: boolean;
  onToggleReact: () => void;
  onOpen: () => void;
}

const TEXT_COLOR = "hsl(20 35% 18%)";
const MUTED_COLOR = "hsl(20 25% 30%)";
const TRUNCATE_AT = 140;
const TRUNCATE_AT_MEDIA = 90;

export default function WallCard({
  id,
  description,
  firstName,
  mode,
  language,
  photoUrl,
  videoThumbUrl,
  reactionCount,
  reacted,
  onToggleReact,
  onOpen,
}: Props) {
  const { t, lang } = useLanguage();
  const original = (description ?? "").trim();
  const hasText = original.length > 0;

  const { translation, loading, needed, sourceLang } = useActTranslation(
    id,
    original,
    language,
    lang,
  );
  const [showOriginal, setShowOriginal] = useState(false);
  const displayText =
    needed && translation && !showOriginal ? translation : original;

  // If both photo and video, prefer photo for the polaroid frame.
  const showVideo = !photoUrl && !!videoThumbUrl;
  const mediaUrl = photoUrl ?? videoThumbUrl ?? null;
  const hasMedia = !!mediaUrl;

  const cutoff = hasMedia ? TRUNCATE_AT_MEDIA : TRUNCATE_AT;
  const isLong = hasText && displayText.length > cutoff;
  const truncated = isLong ? displayText.slice(0, cutoff).trimEnd() + "…" : displayText;

  const gradient = pickCardGradient(id);
  const modeLabel =
    mode === "performed"
      ? t.inspiration.tagGiven
      : mode === "received"
      ? t.inspiration.tagReceived
      : t.inspiration.tagSeen;

  const fontStack = "'DM Sans', system-ui, sans-serif";

  const translatedLabel =
    sourceLang === "en"
      ? t.inspiration.translatedFromEn
      : sourceLang === "es"
      ? t.inspiration.translatedFromEs
      : "";

  const renderTranslationStrip = () => {
    if (!needed) return null;
    if (loading && !translation) {
      return (
        <span
          className="inline-flex items-center gap-1 text-[10px] italic"
          style={{ color: MUTED_COLOR }}
        >
          <Loader2 size={10} className="animate-spin" />
          {t.inspiration.translating}
        </span>
      );
    }
    if (!translation) return null;
    return (
      <span className="text-[10px]" style={{ color: MUTED_COLOR }}>
        <span className="italic">{translatedLabel}</span>
        {" · "}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowOriginal((v) => !v);
          }}
          className="underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          {showOriginal ? t.inspiration.seeTranslation : t.inspiration.seeOriginal}
        </button>
      </span>
    );
  };

  return (
    <div
      className="relative w-full flex flex-col overflow-hidden rounded-2xl border border-border shadow-sm"
      style={{ background: gradient, fontFamily: fontStack, minHeight: 360 }}
    >
      {/* Mode tag */}
      <div
        className="px-5 pt-4 pb-2 flex items-center gap-1.5"
        style={{ color: TEXT_COLOR, opacity: 0.7 }}
      >
        <PalanteArrow size={13} />
        <span className="text-[10px] uppercase tracking-[0.22em] leading-none">
          <span className="font-normal">{splitKindnessTag(modeLabel).noun}</span>
          {splitKindnessTag(modeLabel).action && (
            <>
              {" "}
              <span className="font-bold">{splitKindnessTag(modeLabel).action}</span>
            </>
          )}
        </span>
      </div>


      {hasMedia ? (
        <>
          {/* Polaroid frame */}
          <div className="px-5 pb-3 flex justify-center">
            <button
              type="button"
              onClick={onOpen}
              className="group relative block bg-white p-2 pb-5 rounded-sm shadow-md hover:shadow-lg transition-shadow"
              style={{ border: "1px solid rgba(255,255,255,0.9)", width: 168 }}
              aria-label={showVideo ? "Play video" : t.inspiration.readMore}
            >
              <div className="w-full aspect-square overflow-hidden bg-black/5">
                <img
                  src={mediaUrl!}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              {showVideo && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black/60 text-white group-hover:bg-black/75 transition-colors shadow-lg">
                    <Play size={22} className="fill-current ml-0.5" />
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Description under media */}
          {hasText && (
            <div className="px-5 pb-3 text-center">
              <p
                className="m-0 font-semibold text-sm leading-relaxed"
                style={{ color: TEXT_COLOR }}
              >
                {`"${truncated}"`}
                {isLong && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={onOpen}
                      className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                      style={{ color: MUTED_COLOR }}
                    >
                      {t.inspiration.readMore}
                    </button>
                  </>
                )}
              </p>
              <div className="mt-1.5">{renderTranslationStrip()}</div>
            </div>
          )}
        </>
      ) : (
        // No media → centered text layout
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-6">
          <p
            className="m-0 font-bold text-base leading-relaxed"
            style={{ color: TEXT_COLOR }}
          >
            {hasText ? `"${truncated}"` : t.inspiration.noDescription}
            {isLong && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onOpen}
                  className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                  style={{ color: MUTED_COLOR }}
                >
                  {t.inspiration.readMore}
                </button>
              </>
            )}
          </p>
          {hasText && <div className="mt-2">{renderTranslationStrip()}</div>}
        </div>
      )}

      {/* Footer chrome */}
      <div className="mt-auto flex items-center justify-between px-5 py-3 border-t border-foreground/5">
        <span className="text-xs font-semibold" style={{ color: TEXT_COLOR }}>
          {firstName || t.inspiration.anonymous}
        </span>
        <button
          onClick={onToggleReact}
          aria-label="Heart"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
          style={{ color: TEXT_COLOR }}
        >
          <Heart size={16} className={reacted ? "fill-current" : ""} />
          {reactionCount}
        </button>
      </div>
    </div>
  );
}
