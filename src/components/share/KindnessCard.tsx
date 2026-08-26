import { forwardRef, useRef } from "react";
import { Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAutoFitText } from "@/hooks/useAutoFitText";
import { pickCardGradient } from "@/lib/cardGradients";
import PalanteArrow from "@/components/icons/PalanteArrow";
import { splitKindnessTag } from "@/lib/splitKindnessTag";

export type KindnessCardVariant = "minimal" | "branded";

interface Props {
  description?: string | null;
  firstName?: string | null;
  mode?: string | null;
  photoUrl?: string | null;
  variant: KindnessCardVariant;
  reactionCount?: number;
  reacted?: boolean;
  onToggleReact?: () => void;
  onReadMore?: () => void;
  seed?: string | null;
}

const TEXT_SHADOW = "0 1px 2px rgba(255,255,255,0.4)";
const TEXT_COLOR = "hsl(20 35% 18%)";
const MUTED_COLOR = "hsl(20 25% 30%)";
const TRUNCATE_AT = 150;

const KindnessCard = forwardRef<HTMLDivElement, Props>(function KindnessCard(
  {
    description,
    firstName,
    mode,
    photoUrl,
    variant,
    reactionCount = 0,
    reacted = false,
    onToggleReact,
    onReadMore,
    seed,
  },
  ref,
) {
  const { t } = useLanguage();
  const modeLabel =
    mode === "performed"
      ? t.inspiration.tagGiven
      : mode === "received"
      ? t.inspiration.tagReceived
      : mode === "witnessed"
      ? t.inspiration.tagSeen
      : null;

  const text = (description ?? "").trim();
  const hasText = text.length > 0;
  const hasPhoto = !!photoUrl;
  const isBranded = variant === "branded";

  const photoOnly = hasPhoto && !hasText;
  const photoText = hasPhoto && hasText;
  const textOnly = !hasPhoto && hasText;
  const emptyBranded = !hasPhoto && !hasText && isBranded;

  const isLong = hasText && !isBranded && text.length > TRUNCATE_AT;
  const truncated = isBranded
    ? hasText && text.length > 400
      ? text.slice(0, 397).trimEnd() + "…"
      : text
    : isLong
      ? text.slice(0, TRUNCATE_AT).trimEnd() + "…"
      : text;

  const gradient = pickCardGradient(seed);

  const textBox = useRef<HTMLDivElement>(null);
  const textEl = useRef<HTMLParagraphElement>(null);
  useAutoFitText(textBox, textEl, 20, 12, [truncated, photoText, textOnly, emptyBranded], 1.4);

  const containerAspect = isBranded ? "aspect-square" : photoText || photoOnly ? "" : "aspect-square";

  const baseClass =
    `relative w-full overflow-hidden rounded-2xl border border-border shadow-sm ${containerAspect}`;

  const fontStack = "'DM Sans', system-ui, sans-serif";

  // Shared eyebrow for branded
  const renderBrandedEyebrow = () => (
    <div className="absolute top-0 left-0 right-0 z-10 flex flex-col gap-0.5 px-5 pt-4">
      <span
        className="text-[10px] uppercase tracking-[0.25em] font-bold"
        style={{ color: TEXT_COLOR }}
      >
        Pásalo Pa'lante
      </span>
      {modeLabel && (
        <span
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] leading-none"
          style={{ color: MUTED_COLOR, opacity: 0.7 }}
        >
          <PalanteArrow size={12} />
          <span>
            <span className="font-normal">{splitKindnessTag(modeLabel).noun}</span>
            {splitKindnessTag(modeLabel).action && (
              <>
                {" "}
                <span className="font-bold">{splitKindnessTag(modeLabel).action}</span>
              </>
            )}
          </span>
        </span>
      )}
    </div>
  );


  const renderLogoWatermark = () => (
    isBranded && (
      <img
        src="/logo-PPL.png"
        alt=""
        crossOrigin="anonymous"
        className="absolute bottom-3 right-3 z-20 w-8 h-8 object-contain opacity-80"
        style={{ filter: "brightness(0)" }}
      />
    )
  );

  return (
    <div
      ref={ref}
      className={baseClass}
      style={{ background: gradient, fontFamily: fontStack }}
    >
      {/* ===================== PHOTO + TEXT ===================== */}
      {photoText && (
        <div className={`flex flex-col ${isBranded ? "absolute inset-0" : ""}`}>
          <div
            className="relative w-full flex items-center justify-center"
            style={
              isBranded
                ? { flex: "1 1 60%", minHeight: 0 }
                : { aspectRatio: "4 / 3" }
            }
          >
            <img
              src={photoUrl!}
              alt=""
              loading="lazy"
              crossOrigin="anonymous"
              className="max-w-full max-h-full w-auto h-auto object-contain"
            />
            {isBranded && renderBrandedEyebrow()}
          </div>

          {/* Text panel */}
          <div
            ref={textBox}
            className="relative flex items-center justify-center text-center px-5"
            style={
              isBranded
                ? { flex: "1 1 40%", minHeight: 0, paddingTop: 12, paddingBottom: 40 }
                : { paddingTop: 18, paddingBottom: 52, minHeight: 100 }
            }
          >
            <p
              ref={textEl}
              className="m-0 font-bold"
              style={{ color: TEXT_COLOR, fontFamily: fontStack }}
            >
              {`"${truncated}"`}
              {isLong && onReadMore && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReadMore();
                    }}
                    className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                    style={{ color: MUTED_COLOR }}
                  >
                    {t.inspiration.readMore}
                  </button>
                </>
              )}
            </p>
            {isBranded && firstName && (
              <p
                className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-semibold"
                style={{ color: MUTED_COLOR }}
              >
                — {firstName}
              </p>
            )}
            {isBranded && renderLogoWatermark()}
          </div>
        </div>
      )}

      {/* ===================== PHOTO ONLY ===================== */}
      {photoOnly && (
        <div
          className={`${isBranded ? "absolute inset-0" : ""} w-full flex items-center justify-center`}
          style={isBranded ? undefined : { aspectRatio: "4 / 3" }}
        >
          <img
            src={photoUrl!}
            alt=""
            loading="lazy"
            crossOrigin="anonymous"
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
          {isBranded && renderBrandedEyebrow()}
          {isBranded && renderLogoWatermark()}
        </div>
      )}

      {/* ===================== TEXT ONLY (or empty branded) ===================== */}
      {(textOnly || emptyBranded) && (
        <>
          {isBranded && renderBrandedEyebrow()}
          <div
            ref={textBox}
            className="absolute left-0 right-0 flex items-center justify-center text-center px-8"
            style={{
              top: isBranded ? 56 : 40,
              bottom: variant === "minimal" ? 56 : 60,
            }}
          >
            <p
              ref={textEl}
              className="m-0 font-bold"
              style={{ color: TEXT_COLOR, fontFamily: fontStack }}
            >
              {hasText ? `“${truncated}"` : t.share.defaultGraphicLine}
              {isLong && onReadMore && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReadMore();
                    }}
                    className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
                    style={{ color: MUTED_COLOR }}
                  >
                    {t.inspiration.readMore}
                  </button>
                </>
              )}
            </p>
          </div>
          {isBranded && firstName && hasText && (
            <p
              className="absolute left-0 right-0 text-center text-sm font-semibold"
              style={{ bottom: 56, color: MUTED_COLOR }}
            >
              — {firstName}
            </p>
          )}
          {isBranded && renderLogoWatermark()}
        </>
      )}

      {/* ===================== FOOTER CHROME ===================== */}
      {variant === "minimal" ? (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-5 py-2.5">
          <span
            className="text-xs font-semibold"
            style={{ color: TEXT_COLOR }}
          >
            {firstName || t.inspiration.anonymous}
          </span>
          {onToggleReact && (
            <button
              onClick={onToggleReact}
              aria-label="Heart"
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-70 transition-opacity"
              style={{ color: TEXT_COLOR }}
            >
              <Heart size={16} className={reacted ? "fill-current" : ""} />
              {reactionCount}
            </button>
          )}
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3">
          <span
            className="text-[11px] tracking-wider font-semibold"
            style={{ color: MUTED_COLOR }}
          >
            {t.share.graphicFooter}
          </span>
          <span
            className="text-[11px] font-bold"
            style={{ color: TEXT_COLOR }}
          >
            {"\n"}
          </span>
        </div>
      )}
    </div>
  );
});

KindnessCard.displayName = "KindnessCard";
export default KindnessCard;
