import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import Sheet from "./Sheet";
import { useHubCopy } from "@/lib/hubCopy";
import type { Me } from "@/lib/hub";
import { saveBlob } from "@/lib/certificate";
import {
  canvasBlob,
  clampAdjust,
  FORMATS,
  loadCobrand,
  MAX_ZOOM,
  NO_ADJUST,
  paintCobrand,
  photoArea,
  type CobrandAssets,
  type CobrandFormat,
  type CobrandOpts,
  type PhotoAdjust,
} from "@/lib/cobrand";

/** A real photo from the partner kit, shown until the member picks their own. */
export const SAMPLE_PHOTO = "/hub/sample-photo.jpg";

export type Adjustments = Partial<Record<CobrandFormat, PhotoAdjust>>;

/** What a picture shows for this member: their photo, their logo, or the sample. */
export function pictureSource(format: CobrandFormat, me: Me, photoUrl: string | null, withLogo = true) {
  const solo = me.kind === "ambassador";
  const photo = photoUrl ?? (solo ? me.logoUrl : null);
  const logoMode = format === "profile" && !photo && !!me.logoUrl;
  return {
    photo,
    logoMode,
    sample: !photo && !logoMode,
    opts: (lang: "en" | "es", adjust?: PhotoAdjust): CobrandOpts => ({
      kind: me.kind,
      lang,
      name: me.name,
      logoUrl: logoMode ? me.logoUrl : !solo && withLogo ? me.logoUrl : null,
      photoUrl: photo ?? (logoMode ? null : SAMPLE_PHOTO),
      adjust,
    }),
  };
}

/**
 * The picture editor (25 Nov 2026): the member's photo goes into the real kit post, story or
 * frame, and they drag it into place and zoom, the way a phone's profile-picture editor works.
 * Everything happens in the browser; the photo never leaves the device.
 */
export default function PhotoStudio({
  open,
  onClose,
  me,
  lang,
  formats,
  start,
  photoUrl,
  onPhoto,
  adjust,
  onAdjust,
}: {
  open: boolean;
  onClose: () => void;
  me: Me;
  lang: "en" | "es";
  formats: CobrandFormat[];
  start: CobrandFormat;
  photoUrl: string | null;
  onPhoto: (file: File) => void;
  adjust: Adjustments;
  onAdjust: (format: CobrandFormat, a: PhotoAdjust) => void;
}) {
  const { h } = useHubCopy();
  const [format, setFormat] = useState<CobrandFormat>(start);
  const [withLogo, setWithLogo] = useState(true);
  const [loaded, setLoaded] = useState<{ key: string; assets: CobrandAssets } | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  useEffect(() => {
    if (open) setFormat(start);
  }, [open, start]);
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chipsRef.current?.querySelector(`[data-format="${format}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [format, open]);

  const src = pictureSource(format, me, photoUrl, withLogo);
  const a = adjust[format] ?? NO_ADJUST;
  const opts = src.opts(lang, a);
  const key = `${format}|${lang}|${opts.photoUrl}|${opts.logoUrl}|${me.kind}`;
  const assets = loaded?.key === key ? loaded.assets : null;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadCobrand(format, opts).then((x) => alive && setLoaded({ key, assets: x }));
    return () => {
      alive = false;
    };
    // the key covers everything the assets depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, key]);

  useEffect(() => {
    if (open && assets && canvasRef.current) paintCobrand(canvasRef.current, format, opts, assets);
  });

  // pointer events can arrive faster than the screen redraws, so each move builds on the last one
  const aRef = useRef(a);
  aRef.current = a;
  const update = useCallback(
    (fn: (prev: PhotoAdjust) => PhotoAdjust) => {
      const next = clampAdjust(format, assets?.photo ?? null, fn(aRef.current), src.logoMode);
      aRef.current = next;
      onAdjust(format, next);
    },
    [onAdjust, format, assets, src.logoMode],
  );

  // zoom with the mouse wheel, without scrolling the page
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      update((p) => ({ ...p, zoom: p.zoom * Math.exp(-e.deltaY * 0.0015) }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [update]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !canvasRef.current) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 1) {
      const k = FORMATS[format].w / canvasRef.current.getBoundingClientRect().width;
      const area = src.logoMode ? { w: FORMATS[format].w, h: FORMATS[format].h } : photoArea(format);
      update((p) => ({ ...p, x: p.x + ((cur.x - prev.x) * k) / area.w, y: p.y + ((cur.y - prev.y) * k) / area.h }));
    } else if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      const last = pinch.current;
      if (last) update((p) => ({ ...p, zoom: (p.zoom * d) / last }));
      pinch.current = d;
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  }

  async function download() {
    if (!canvasRef.current) return;
    setSaving(true);
    try {
      saveBlob(await canvasBlob(canvasRef.current), `${me.name} - Kindness Forward ${FORMATS[format].en.toLowerCase()}.png`);
    } finally {
      setSaving(false);
    }
  }

  const spec = FORMATS[format];
  const hasTab = format === "announcePost" || format === "announceStory";
  const minZoom = src.logoMode ? 0.4 : 1;

  return (
    <Sheet open={open} onClose={onClose} title={h.studioTitle} wide>
      <div className="flex flex-col gap-4">
        {/* which picture */}
        <div ref={chipsRef} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]" role="tablist">
          {formats.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={f === format}
              data-format={f}
              onClick={() => setFormat(f)}
              className={`h-9 shrink-0 px-3.5 text-[13px] font-bold ${f === format ? "bg-sky text-white" : "border-[1.5px] border-hair text-ink2 hover:border-sky"}`}
            >
              {lang === "es" ? FORMATS[f].es : FORMATS[f].en}
            </button>
          ))}
        </div>

        {/* the picture itself: drag to move, pinch or scroll to zoom */}
        <div className="flex justify-center bg-tint-sky/60 py-3">
          <div
            ref={stageRef}
            className="relative cursor-grab touch-none select-none active:cursor-grabbing"
            style={{ width: `min(100%, calc(48vh * ${spec.w / spec.h}))` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas
              ref={canvasRef}
              width={spec.w}
              height={spec.h}
              className="block h-auto w-full shadow-[0_10px_30px_rgba(14,35,75,0.18)]"
              aria-label={lang === "es" ? spec.es : spec.en}
            />
            {!assets && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/60">
                <Loader2 className="h-7 w-7 animate-spin text-sky" aria-hidden="true" />
              </span>
            )}
            {src.sample && assets && (
              <span className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
                <span className="bg-white/95 px-3 py-1.5 text-[12.5px] font-extrabold text-navy shadow">{h.samplePhoto}</span>
              </span>
            )}
          </div>
        </div>

        {/* move and zoom */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => update((p) => ({ ...p, zoom: p.zoom / 1.15 }))} className="flex h-9 w-9 shrink-0 items-center justify-center text-ink2 hover:bg-tint-sky" aria-label={h.zoomOut}>
            <ZoomOut className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={minZoom * 100}
            max={MAX_ZOOM * 100}
            value={Math.round(a.zoom * 100)}
            onChange={(e) => update((p) => ({ ...p, zoom: Number(e.target.value) / 100 }))}
            className="h-2 min-w-0 flex-1 accent-sky"
            aria-label={h.zoom}
          />
          <button type="button" onClick={() => update((p) => ({ ...p, zoom: p.zoom * 1.15 }))} className="flex h-9 w-9 shrink-0 items-center justify-center text-ink2 hover:bg-tint-sky" aria-label={h.zoomIn}>
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onAdjust(format, NO_ADJUST)} className="btn-quiet shrink-0 text-[13px]">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {h.reset}
          </button>
        </div>
        <p className="m-0 flex items-center gap-2 text-[12.5px] font-semibold text-ink-faint">
          <Move className="h-4 w-4 shrink-0" aria-hidden="true" />
          {h.dragHint}
        </p>

        {hasTab && me.logoUrl && me.kind !== "ambassador" && (
          <label className="flex cursor-pointer items-center gap-3 text-[14px] font-bold text-navy">
            <input type="checkbox" checked={withLogo} onChange={(e) => setWithLogo(e.target.checked)} className="h-5 w-5 accent-sky" />
            {h.logoOnTab}
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t-[1.5px] border-hair pt-4">
          {src.sample ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-orange h-11 px-4">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
              {h.choosePhoto}
            </button>
          ) : (
            <>
              <button type="button" onClick={download} disabled={!assets || saving} className="btn-orange h-11 px-4">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Download className="h-5 w-5" aria-hidden="true" />}
                {h.download}
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-line h-11 px-4">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                {src.logoMode ? h.usePhotoInstead : h.changePhoto}
              </button>
            </>
          )}
          <span className="text-[12.5px] font-semibold text-ink-faint">{h.photoStaysHere}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && f.type.startsWith("image/")) onPhoto(f);
          }}
        />
      </div>
    </Sheet>
  );
}
