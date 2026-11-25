import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Download, ImagePlus, Loader2, Move, Sparkles, Upload } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import { uploadLogo, useSaveProfile, type Me } from "@/lib/hub";
import { canvasBlob, drawCobrand, FORMATS, LOGO_FORMATS, PHOTO_FORMATS, PHOTO_FORMATS_SOLO, type CobrandFormat } from "@/lib/cobrand";
import { saveBlob } from "@/lib/certificate";
import { pictureSource, type Adjustments } from "./PhotoStudio";

/**
 * "Made for you" on the Kit page: the member adds their logo (saved to their profile) and/or a
 * photo (kept on the device only), and their kit is drawn for them. With a logo: post, story,
 * badge, LinkedIn banner and a framed profile picture. With a photo: the announcement post and
 * story, the photo frames and a framed profile picture, each one opening in the editor to move
 * and zoom the photo. An ambassador's profile photo stands in for a logo.
 */
export default function MadeForYou({
  me,
  lang,
  photoUrl,
  onPhoto,
  adjust,
  onEdit,
}: {
  me: Me;
  lang: "en" | "es";
  photoUrl: string | null;
  onPhoto: (file: File) => void;
  adjust: Adjustments;
  onEdit: (format: CobrandFormat) => void;
}) {
  const { h } = useHubCopy();
  const save = useSaveProfile();
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const solo = me.kind === "ambassador";

  async function addLogo(file: File) {
    setError(null);
    setBusy(true);
    try {
      const path = await uploadLogo(file, me.id, solo ? "photo" : "logo");
      await save.mutateAsync({
        city: me.city ?? "",
        country: me.country ?? "",
        region: me.region ?? "",
        orgType: me.orgType ?? "",
        website: me.website ?? "",
        instagram: me.instagram ?? "",
        facebook: me.facebook ?? "",
        linkedin: me.linkedin ?? "",
        about: me.about ?? "",
        contactName: me.contactName ?? "",
        logoPath: path,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : h.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  const logoLabel = solo ? (me.logoUrl ? h.changePhoto : h.addPhoto) : me.logoUrl ? h.changeLogo : h.addLogo;
  const hasPhoto = !!(photoUrl ?? (solo ? me.logoUrl : null));
  const photoFormats = solo ? PHOTO_FORMATS_SOLO : PHOTO_FORMATS;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="h-section flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange" aria-hidden="true" />
            {h.madeForYou}
          </h2>
          <p className="m-0 mt-1 text-[14px] font-medium text-ink-muted">{solo ? h.madeForYouIntroSolo : h.madeForYouIntro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => logoRef.current?.click()} disabled={busy} className={me.logoUrl ? "btn-line h-10 text-sm" : "btn-orange h-10 text-sm"}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {busy ? h.uploading : logoLabel}
          </button>
          {!solo && (
            <button type="button" onClick={() => photoRef.current?.click()} className={photoUrl ? "btn-line h-10 text-sm" : "btn-soft h-10 text-sm"}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {photoUrl ? h.changePhoto : h.addPhoto}
            </button>
          )}
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void addLogo(f);
          }}
        />
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f && f.type.startsWith("image/")) onPhoto(f);
            else if (f) setError(h.somethingWrong);
          }}
        />
      </div>
      {error && <p className="m-0 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-ink">{error}</p>}

      {hasPhoto && (
        <Row title={h.withYourPhoto} note={photoUrl ? h.photoStaysHere : undefined} count={photoFormats.length}>
          {photoFormats.map((f) => (
            <Picture key={f} format={f} me={me} lang={lang} photoUrl={photoUrl} adjust={adjust} onEdit={() => onEdit(f)} />
          ))}
        </Row>
      )}
      {me.logoUrl && !solo && (
        <Row title={h.withYourLogo} count={LOGO_FORMATS.length + (hasPhoto ? 0 : 1)}>
          {(hasPhoto ? LOGO_FORMATS : [...LOGO_FORMATS, "profile" as CobrandFormat]).map((f) => (
            <Picture key={f} format={f} me={me} lang={lang} photoUrl={null} adjust={adjust} onEdit={f === "profile" ? () => onEdit(f) : undefined} />
          ))}
        </Row>
      )}
      {me.logoUrl && solo && (
        <Row title={h.withYourLogo} count={LOGO_FORMATS.length}>
          {LOGO_FORMATS.map((f) => (
            <Picture key={f} format={f} me={me} lang={lang} photoUrl={null} adjust={adjust} />
          ))}
        </Row>
      )}
      {!me.logoUrl && !photoUrl && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-hidden="true">
          {(["announcePost", "framePost", "profile", "badge"] as CobrandFormat[]).map((f) => (
            <div
              key={f}
              className="flex aspect-square items-center justify-center border-[1.5px] border-dashed border-hair bg-tint-sky/40 p-2 text-center text-[12px] font-bold text-ink-faint"
            >
              {lang === "es" ? FORMATS[f].es : FORMATS[f].en}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ title, note, count, children }: { title: string; note?: string; count: number; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="m-0 text-[15px] font-extrabold">{title}</h3>
        {note && <span className="text-[12.5px] font-semibold text-ink-faint">{note}</span>}
      </div>
      <div
        className="-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:px-0"
        style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(count, 3), 5)}, minmax(0, 1fr))` }}
      >
        {children}
      </div>
    </div>
  );
}

/** A live preview of one picture, drawn in the browser. Used here and on kit cards. */
export function LivePicture({
  format,
  me,
  lang,
  photoUrl,
  adjust,
  logoOnly = false,
  onCanvas,
}: {
  format: CobrandFormat;
  me: Me;
  lang: "en" | "es";
  photoUrl: string | null;
  adjust: Adjustments;
  logoOnly?: boolean;
  onCanvas?: (c: HTMLCanvasElement) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const src = pictureSource(format, me, photoUrl);
  const opts = logoOnly ? { kind: me.kind, lang, name: me.name, logoUrl: me.logoUrl, photoUrl: null } : src.opts(lang, adjust[format]);
  const a = adjust[format];
  const key = `${format}|${lang}|${opts.photoUrl}|${opts.logoUrl}|${me.kind}|${me.name}|${a?.zoom}|${a?.x}|${a?.y}`;

  useEffect(() => {
    let alive = true;
    drawCobrand(format, opts).then((c) => {
      if (!alive || !holder.current) return;
      c.className = "block max-h-full max-w-full object-contain";
      holder.current.replaceChildren(c);
      setReady(true);
      onCanvas?.(c);
    });
    return () => {
      alive = false;
    };
    // the key covers everything the drawing depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div ref={holder} className="flex h-full w-full items-center justify-center" />
      {!ready && <Loader2 className="absolute h-6 w-6 animate-spin text-sky" aria-hidden="true" />}
    </div>
  );
}

function Picture({
  format,
  me,
  lang,
  photoUrl,
  adjust,
  onEdit,
}: {
  format: CobrandFormat;
  me: Me;
  lang: "en" | "es";
  photoUrl: string | null;
  adjust: Adjustments;
  onEdit?: () => void;
}) {
  const { h } = useHubCopy();
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const spec = FORMATS[format];
  const logoOnly = photoUrl === null && !onEdit;

  async function download() {
    if (!canvas.current) return;
    setBusy(true);
    try {
      saveBlob(await canvasBlob(canvas.current), `${me.name} - Kindness Forward ${spec.en.toLowerCase()}.png`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const preview = (
    <LivePicture format={format} me={me} lang={lang} photoUrl={photoUrl} adjust={adjust} logoOnly={logoOnly} onCanvas={(c) => (canvas.current = c)} />
  );

  return (
    <article className="flex w-[44%] shrink-0 snap-start flex-col gap-2 sm:w-[200px] lg:w-auto">
      {onEdit ? (
        <button type="button" onClick={onEdit} className="group relative flex aspect-square items-center justify-center overflow-hidden bg-tint-sky p-2" aria-label={`${h.adjust}: ${lang === "es" ? spec.es : spec.en}`}>
          {preview}
          <span className="absolute bottom-2 end-2 flex h-8 w-8 items-center justify-center bg-white/95 text-sky-deep shadow transition group-hover:bg-sky group-hover:text-white">
            <Move className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-tint-sky p-2">{preview}</div>
      )}
      <h4 className="m-0 text-[14px] font-extrabold leading-snug">{lang === "es" ? spec.es : spec.en}</h4>
      {failed ? (
        <Link to="/me/edit" className="text-[12.5px] font-semibold text-rose-ink">
          {h.changeLogo}
        </Link>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={download} disabled={busy} className="btn-soft h-9 w-fit px-3 text-[13px]">
            <Download className="h-4 w-4" aria-hidden="true" />
            {h.download}
          </button>
          {onEdit && (
            <button type="button" onClick={onEdit} className="btn h-9 border-[1.5px] border-hair px-3 text-[13px] text-ink2 hover:border-sky">
              <Move className="h-4 w-4" aria-hidden="true" />
              {h.adjust}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
