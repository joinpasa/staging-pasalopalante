import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Download, ImagePlus, Loader2, Sparkles, Upload } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import { uploadLogo, useSaveProfile, type Me } from "@/lib/hub";
import { canvasBlob, drawCobrand, FORMATS, LOGO_FORMATS, PHOTO_FORMATS, type CobrandFormat } from "@/lib/cobrand";
import { saveBlob } from "@/lib/certificate";

/**
 * "Made for you" on the Kit page: the member adds their logo (saved to their profile) and/or a
 * photo (kept on the device only), and their kit is drawn for them. With a logo: post, story,
 * badge, LinkedIn banner and a framed profile picture. With a photo: a post, a story and a framed
 * profile picture. An ambassador's profile photo stands in for a logo.
 */
export default function MadeForYou({ me, lang }: { me: Me; lang: "en" | "es" }) {
  const { h } = useHubCopy();
  const save = useSaveProfile();
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const solo = me.kind === "ambassador";

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

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

  function addPhoto(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError(h.somethingWrong);
    setPhotoUrl(URL.createObjectURL(file));
  }

  const logoLabel = solo ? (me.logoUrl ? h.changePhoto : h.addPhoto) : me.logoUrl ? h.changeLogo : h.addLogo;
  const photoForPictures = photoUrl ?? (solo ? me.logoUrl : null);

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
            if (f) addPhoto(f);
          }}
        />
      </div>
      {error && <p className="m-0 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-ink">{error}</p>}

      {photoForPictures && (
        <Row title={h.withYourPhoto} note={photoUrl ? h.photoStaysHere : undefined}>
          {PHOTO_FORMATS.map((f) => (
            <Picture key={`${f}-${lang}-${photoForPictures}`} format={f} me={me} lang={lang} photoUrl={photoForPictures} logoUrl={solo ? null : me.logoUrl} />
          ))}
        </Row>
      )}
      {me.logoUrl && (
        <Row title={h.withYourLogo}>
          {(solo ? LOGO_FORMATS : [...LOGO_FORMATS, "profile" as CobrandFormat]).map((f) => (
            <Picture key={`${f}-${lang}-${me.logoUrl}`} format={f} me={me} lang={lang} photoUrl={null} logoUrl={me.logoUrl} />
          ))}
        </Row>
      )}
      {!me.logoUrl && !photoUrl && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-hidden="true">
          {(["photoPost", "photoStory", "profile", "badge"] as CobrandFormat[]).map((f) => (
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

function Row({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="m-0 text-[15px] font-extrabold">{title}</h3>
        {note && <span className="text-[12.5px] font-semibold text-ink-faint">{note}</span>}
      </div>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">{children}</div>
    </div>
  );
}

function Picture({ format, me, lang, photoUrl, logoUrl }: { format: CobrandFormat; me: Me; lang: "en" | "es"; photoUrl: string | null; logoUrl: string | null }) {
  const { h } = useHubCopy();
  const holder = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const spec = FORMATS[format];

  useEffect(() => {
    let alive = true;
    drawCobrand(format, { kind: me.kind, lang, name: me.name, logoUrl, photoUrl }).then((c) => {
      if (!alive) return;
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.objectFit = "contain";
      setCanvas(c);
    });
    return () => {
      alive = false;
    };
  }, [format, lang, me.kind, me.name, logoUrl, photoUrl]);

  useEffect(() => {
    if (canvas && holder.current) holder.current.replaceChildren(canvas);
  }, [canvas]);

  async function download() {
    if (!canvas) return;
    setBusy(true);
    try {
      const blob = await canvasBlob(canvas);
      saveBlob(blob, `${me.name} - Kindness Forward ${spec.en.toLowerCase()}.png`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="flex w-[200px] shrink-0 flex-col gap-2 lg:w-auto">
      <div ref={holder} className="flex aspect-square items-center justify-center overflow-hidden bg-tint-sky p-2">
        <Loader2 className="h-6 w-6 animate-spin text-sky" aria-hidden="true" />
      </div>
      <h4 className="m-0 text-[14px] font-extrabold leading-snug">{lang === "es" ? spec.es : spec.en}</h4>
      {failed ? (
        <Link to="/me/edit" className="text-[12.5px] font-semibold text-rose-ink">
          {h.changeLogo}
        </Link>
      ) : (
        <button type="button" onClick={download} disabled={!canvas || busy} className="btn-soft h-9 w-fit px-3 text-[13px]">
          <Download className="h-4 w-4" aria-hidden="true" />
          {h.download}
        </button>
      )}
    </article>
  );
}
