import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronDown, Copy, Download, ExternalLink, FileText, FileArchive, GraduationCap, ImagePlus, Mic, Move, Package, Star } from "lucide-react";
import Shell from "@/components/Shell";
import MadeForYou, { LivePicture } from "@/components/MadeForYou";
import PhotoStudio, { type Adjustments } from "@/components/PhotoStudio";
import { useHubCopy } from "@/lib/hubCopy";
import { isNew, kitFileUrl, useKit, useMe, type KitItem, type Me } from "@/lib/hub";
import { NO_ADJUST, PHOTO_FORMATS, PHOTO_FORMATS_SOLO, type CobrandFormat, type PhotoAdjust } from "@/lib/cobrand";
import { kitAudienceMatches } from "@/lib/kinds";
import type { Lang } from "@/lib/i18n";

/**
 * The kit, laid out as a few shelves rather than a list of files: the whole kit and the guide on
 * top, the pictures made for them, then posts, profiles, things to share, print, email, meetings
 * and the official logos, each with one line saying what it's for.
 */

type ShelfId = "post" | "outreach" | "profile" | "share" | "print" | "email" | "meet" | "logos";

const SHELVES: { id: ShelfId; sections: KitItem["section"][]; en: [string, string]; es: [string, string]; first: number }[] = [
  { id: "post", sections: ["social"], en: ["Post it", "Ready posts, stories and frames. Download, copy the caption, post."], es: ["Para publicar", "Publicaciones, historias y marcos listos. Descarga, copia el texto y publica."], first: 4 },
  // 27 Nov 2026, asked for by PSol: letter templates ambassadors adapt and send (see OutreachSoon)
  { id: "outreach", sections: ["outreach"], en: ["Outreach letters", "Letters to invite people in, and to welcome them once they say yes. Download one, make it yours, send it."], es: ["Cartas para invitar", "Cartas para invitar a otros a sumarse y darles la bienvenida cuando digan que sí. Descarga una, hazla tuya y envíala."], first: 4 },
  { id: "profile", sections: ["profile"], en: ["Update your profiles", "Borders, badges and banners that show you're part of the movement."], es: ["Actualiza tus perfiles", "Bordes, sellos y portadas que muestran que son parte del movimiento."], first: 4 },
  { id: "share", sections: ["start"], en: ["Share Kindness Forward", "A one-pager and a short presentation, for your team or anyone you'd like to bring in."], es: ["Comparte Pásalo Pa'lante", "Un resumen y una presentación corta, para tu equipo o para quien quieras sumar."], first: 4 },
  { id: "print", sections: ["print"], en: ["Print and put up", "Posters and pages to print, with a QR code to the pledge page."], es: ["Para imprimir", "Afiches y páginas para imprimir, con un código QR a la página del compromiso."], first: 4 },
  { id: "email", sections: ["email"], en: ["Email", "Your signature and messages ready to send."], es: ["Correo", "Tu firma y mensajes listos para enviar."], first: 4 },
  { id: "meet", sections: ["other", "video"], en: ["Meetings", "Backgrounds and slides for your calls and team meetings."], es: ["Reuniones", "Fondos y diapositivas para tus llamadas y reuniones."], first: 4 },
  { id: "logos", sections: ["logos"], en: ["Official logos", "Use them exactly as they are."], es: ["Logos oficiales", "Úsalos tal cual."], first: 8 },
];

/** Kit files that are photo-ready templates: they open in the picture editor with the member's photo. */
function studioFormat(k: KitItem): CobrandFormat | null {
  const t = k.title.toLowerCase();
  // the company kit's announcement is its own design, so only the partner kit's opens in the editor
  if (k.section === "social" && k.audience === "organisation" && t.startsWith("announcement post")) return "announcePost";
  if (k.section === "social" && k.audience === "organisation" && t.startsWith("announcement story")) return "announceStory";
  if (k.section === "social" && t.startsWith("photo frame for a post")) return "framePost";
  if (k.section === "social" && t.startsWith("photo frame for a story")) return "frameStory";
  if (k.section === "profile" && /profile (picture )?(frame|border)/.test(t)) return "profile";
  return null;
}

/** The member's photo and how they placed it, shared by Made for you, the kit cards and the editor. */
interface PhotoKit {
  me: Me;
  photoUrl: string | null;
  adjust: Adjustments;
  edit: (format: CobrandFormat, lang: "en" | "es") => void;
}
const PhotoCtx = createContext<PhotoKit | null>(null);

const isZip = (k: KitItem) => !!k.mime?.includes("zip") || /\.zip$/i.test(k.file_path ?? "");
const isGuide = (k: KitItem) => k.section === "start" && !isZip(k) && /^start here|^empieza aqu/i.test(`${k.title} ${k.title_es ?? ""}`);

function sizeLabel(bytes: number | null | undefined) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function typeLabel(k: KitItem) {
  if (isZip(k)) return "ZIP";
  if (k.mime?.includes("pdf")) return "PDF";
  if (k.mime?.startsWith("video/")) return "Video";
  if (k.mime?.startsWith("text/")) return "Text";
  if (k.mime?.startsWith("image/")) return k.width ? `${k.width}×${k.height}` : "PNG";
  return k.url && !k.file_path ? "Link" : null;
}

function downloadHref(k: KitItem) {
  const file = kitFileUrl(k.file_path);
  if (file) return `${file}${file.includes("?") ? "&" : "?"}download=`;
  return k.url;
}

export default function KitPage() {
  const { h, lang } = useHubCopy();
  const { data: me } = useMe();
  const { data: items, isLoading } = useKit();
  const [show, setShow] = useState<"en" | "es" | "both">(lang);
  useEffect(() => setShow(lang), [lang]);
  useEffect(() => {
    if (!me) return;
    try {
      localStorage.setItem(`pkf-hub-kit-seen-${me.id}`, "1");
    } catch {
      /* fine */
    }
  }, [me]);

  const mine = useMemo(
    () => (items ?? []).filter((k) => me && kitAudienceMatches(k.audience, me.kind) && (show === "both" || k.lang === "both" || k.lang === show)),
    [items, me, show],
  );
  // the top banner: the whole kit in one download, and the start-here guide
  const zip = mine.find((k) => isZip(k) && k.audience !== "all") ?? mine.find(isZip);
  const guide = mine.find((k) => isGuide(k) && k.audience !== "all") ?? mine.find(isGuide);
  const rest = mine.filter((k) => k !== zip && k !== guide && !isZip(k) && !isGuide(k));
  // ambassadors see the outreach shelf even before the letters are in, with what's coming
  const outreachSoon = !isLoading && me?.kind === "ambassador";
  const shelves = SHELVES.map((s) => ({ ...s, items: rest.filter((k) => s.sections.includes(k.section)) })).filter(
    (s) => s.items.length || (s.id === "outreach" && outreachSoon),
  );
  const pictureLang: Lang = show === "es" ? "es" : show === "en" ? "en" : lang;
  // "New" marks what arrived after the kit was first loaded, not everything on day one
  const firstLoad = Math.min(...(items ?? []).map((k) => new Date(k.added_at).getTime()), Date.now());
  const fresh = (k: KitItem) => new Date(k.added_at).getTime() > firstLoad + 2 * 86_400_000 && isNew(k.added_at, 14);

  // the photo stays in this browser tab; it is never uploaded
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<Adjustments>({});
  const [studio, setStudio] = useState<{ format: CobrandFormat; lang: "en" | "es" } | null>(null);
  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );
  const onPhoto = useCallback((file: File) => {
    setPhotoUrl(URL.createObjectURL(file));
    setAdjust({});
  }, []);
  const onAdjust = useCallback((f: CobrandFormat, a: PhotoAdjust) => setAdjust((x) => ({ ...x, [f]: a })), []);
  const edit = useCallback((format: CobrandFormat, l: "en" | "es") => setStudio({ format, lang: l }), []);
  const photoKit = useMemo(() => (me ? { me, photoUrl, adjust, edit } : null), [me, photoUrl, adjust, edit]);

  return (
    <Shell wide>
      <PhotoCtx.Provider value={photoKit}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-page">{h.kitTitle}</h1>
            <p className="m-0 mt-1 text-[15px] font-medium text-ink-muted">{h.kitSub}</p>
          </div>
          <div className="flex border-[1.5px] border-hair" role="group" aria-label="Language">
            {(["en", "es", "both"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setShow(l)}
                aria-pressed={show === l}
                className={`h-9 px-3.5 text-sm font-bold ${show === l ? "bg-sky text-white" : "text-ink2 hover:bg-tint-sky"}`}
              >
                {l === "en" ? "English" : l === "es" ? "Español" : h.bothLangs}
              </button>
            ))}
          </div>
        </div>

        {(zip || guide) && <StartBanner zip={zip} guide={guide} />}

        {me && <MadeForYou me={me} lang={pictureLang} photoUrl={photoUrl} onPhoto={onPhoto} adjust={adjust} onEdit={(f) => edit(f, pictureLang)} />}

        {isLoading && <div className="h-56 animate-pulse bg-tint-sky/60" />}
        {!isLoading && !mine.length && <p className="m-0 bg-tint-sky px-4 py-6 text-center font-semibold text-ink2">{h.kitEmpty}</p>}

        {shelves.map((s) =>
          s.items.length ? (
            <Shelf key={s.id} id={s.id} title={lang === "es" ? s.es[0] : s.en[0]} blurb={lang === "es" ? s.es[1] : s.en[1]} items={s.items} first={s.first} showLang={show === "both"} fresh={fresh} />
          ) : (
            <OutreachSoon key={s.id} title={lang === "es" ? s.es[0] : s.en[0]} blurb={lang === "es" ? s.es[1] : s.en[1]} />
          ),
        )}
      </div>
      {me && studio && (
        <PhotoStudio
          open
          onClose={() => setStudio(null)}
          me={me}
          lang={studio.lang}
          formats={me.kind === "ambassador" ? PHOTO_FORMATS_SOLO : PHOTO_FORMATS}
          start={studio.format}
          photoUrl={photoUrl}
          onPhoto={onPhoto}
          adjust={adjust}
          onAdjust={onAdjust}
        />
      )}
      </PhotoCtx.Provider>
    </Shell>
  );
}

/** "Everything in one download" and the guide, on a sunny banner. */
function StartBanner({ zip, guide }: { zip?: KitItem; guide?: KitItem }) {
  const { lang } = useHubCopy();
  const es = lang === "es";
  const zipHref = zip ? downloadHref(zip) : null;
  const guideHref = guide ? kitFileUrl(guide.file_path) ?? guide.url : null;
  return (
    <section className="relative overflow-hidden bg-[#8fd3f2] bg-[url('/hub/sky.jpg')] bg-cover bg-[center_35%]">
      <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-7 sm:py-7">
        <div className="flex flex-col items-start gap-2">
          <span className="box bg-magenta text-[15px] text-white">{es ? "Empieza aquí" : "Start here"}</span>
          <span className="box bg-white text-[22px] text-navy sm:text-[26px]">{es ? "Todo tu kit, en una descarga" : "Your whole kit in one download"}</span>
          {zip?.size_bytes ? <span className="bg-white/90 px-2 py-0.5 text-[12.5px] font-bold text-ink2">ZIP · {sizeLabel(zip.size_bytes)}</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {zipHref && (
            <a href={zipHref} className="btn-orange h-11 px-4" download>
              <FileArchive className="h-5 w-5" aria-hidden="true" />
              {es ? "Descargar todo" : "Download everything"}
            </a>
          )}
          {guideHref && (
            <a href={guideHref} target="_blank" rel="noopener noreferrer" className="btn h-11 bg-white px-4 text-navy hover:bg-tint-sky">
              <FileText className="h-5 w-5 text-sky" aria-hidden="true" />
              {es ? "Guía de inicio" : "Read the guide"}
            </a>
          )}
        </div>
      </div>
      <div className="h-2 bg-bar" aria-hidden="true" />
    </section>
  );
}

/**
 * The four pillars ambassadors reach out to, each with an invitation letter (before someone says
 * yes) and a welcome letter (after). Shown until the team uploads the templates in the Kindness
 * Hub (Kit tab, section "Outreach letters"); then the letters show as ordinary kit cards.
 */
const PILLARS: { icon: typeof Star; en: [string, string]; es: [string, string] }[] = [
  { icon: GraduationCap, en: ["Education", "Schools, universities and teachers"], es: ["Educación", "Escuelas, universidades y docentes"] },
  { icon: Mic, en: ["Media", "Press, radio, TV and podcasts"], es: ["Medios", "Prensa, radio, televisión y pódcasts"] },
  { icon: Star, en: ["Kindness champions", "Well-known voices: athletes, artists and creators"], es: ["Campeones de la bondad", "Voces conocidas: atletas, artistas y creadores"] },
  { icon: Building2, en: ["Organisations", "Nonprofits, faith groups, companies and local government"], es: ["Organizaciones", "Organizaciones sin fines de lucro, grupos de fe, empresas y gobiernos locales"] },
];

function OutreachSoon({ title, blurb }: { title: string; blurb: string }) {
  const { h, lang } = useHubCopy();
  return (
    <section className="flex flex-col gap-4 border-t-[1.5px] border-hair pt-6">
      <div className="min-w-0">
        <h2 className="h-section flex flex-wrap items-center gap-2">
          {title}
          <span className="chip bg-gold text-navy">{h.comingSoon}</span>
        </h2>
        <p className="m-0 mt-0.5 text-[14px] font-medium text-ink-muted">{blurb}</p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => {
          const [name, who] = lang === "es" ? p.es : p.en;
          return (
            <li key={p.en[0]} className="flex flex-col gap-3 border-[1.5px] border-hair p-4">
              <span className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-tint-sky text-sky">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <b className="block text-[15px] font-extrabold leading-snug text-navy">{name}</b>
                  <span className="mt-0.5 block text-[13px] font-medium leading-snug text-ink-muted">{who}</span>
                </span>
              </span>
              <span className="mt-auto flex flex-col gap-1.5">
                {[h.inviteLetter, h.welcomeLetter].map((letter) => (
                  <span key={letter} className="flex items-center gap-2 border-[1.5px] border-dashed border-hair px-2.5 py-2 text-[13px] font-bold text-ink-faint">
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {letter}
                  </span>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Shelf({
  id,
  title,
  blurb,
  items,
  first,
  showLang,
  fresh,
}: {
  id: ShelfId;
  title: string;
  blurb: string;
  items: KitItem[];
  first: number;
  showLang: boolean;
  fresh: (k: KitItem) => boolean;
}) {
  const { h, lang } = useHubCopy();
  const [all, setAll] = useState(false);
  const logos = id === "logos";
  return (
    <section className="flex flex-col gap-4 border-t-[1.5px] border-hair pt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="h-section">
            {title} <span className="text-[15px] font-bold text-ink-faint">{items.length}</span>
          </h2>
          <p className="m-0 mt-0.5 text-[14px] font-medium text-ink-muted">{blurb}</p>
        </div>
        {items.length > first && (
          <button type="button" onClick={() => setAll((a) => !a)} className="btn-quiet hidden sm:inline-flex">
            {all ? h.showLess : `${lang === "es" ? "Ver todo" : "Show all"} (${items.length})`}
            <ChevronDown className={`h-4 w-4 transition ${all ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
        )}
      </div>
      {/* a phone swipes through a shelf like an app store; a computer shows a grid */}
      <div
        className={`-mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:gap-x-4 sm:gap-y-7 sm:overflow-visible sm:px-0 sm:pb-0 ${
          logos ? "sm:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {items.map((k, i) => (
          <div key={k.id} className={`w-[44%] shrink-0 snap-start sm:w-auto ${!all && i >= first ? "sm:hidden" : ""}`}>
            <KitCard item={k} compact={logos} showLang={showLang} isFresh={fresh(k)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function KitCard({ item, compact, showLang, isFresh }: { item: KitItem; compact: boolean; showLang: boolean; isFresh: boolean }) {
  const { h, lang } = useHubCopy();
  const [captionOpen, setCaptionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = (lang === "es" && item.title_es) || item.title;
  const desc = (lang === "es" && item.description_es) || item.description;
  const caption = (lang === "es" && item.caption_es) || item.caption || item.caption_es;
  const thumb = kitFileUrl(item.thumb_path) ?? (item.mime?.startsWith("image/") ? kitFileUrl(item.file_path) : null);
  const href = downloadHref(item);
  const external = !item.file_path && !!item.url && /^https?:\/\//.test(item.url);
  const meta = [typeLabel(item), sizeLabel(item.size_bytes)].filter(Boolean).join(" · ");
  const textOnly = !!item.mime?.startsWith("text/");
  const photoKit = useContext(PhotoCtx);
  const format = photoKit ? studioFormat(item) : null;
  const itemLang: "en" | "es" = item.lang === "es" ? "es" : item.lang === "en" ? "en" : lang;
  const hasOwnPhoto = !!photoKit && !!(photoKit.photoUrl ?? (photoKit.me.kind === "ambassador" ? photoKit.me.logoUrl : null));

  async function copy() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      setCaptionOpen(true);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="flex h-full min-w-0 flex-col gap-2.5">
      {format && photoKit ? (
        <button
          type="button"
          onClick={() => photoKit.edit(format, itemLang)}
          className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-tint-sky p-4"
          aria-label={`${hasOwnPhoto ? h.adjust : h.editPhoto}: ${title}`}
        >
          <span className="h-full w-full drop-shadow-[0_6px_14px_rgba(14,35,75,0.18)] transition group-hover:scale-[1.03]">
            <LivePicture format={format} me={photoKit.me} lang={itemLang} photoUrl={photoKit.photoUrl} adjust={photoKit.adjust} />
          </span>
          <span className="absolute start-2 top-2 flex gap-1">
            {isFresh && <span className="chip bg-orange text-white">{h.newBadge}</span>}
            {showLang && item.lang !== "both" && <span className="chip bg-white text-navy">{item.lang.toUpperCase()}</span>}
          </span>
        </button>
      ) : (
      <a
        href={external ? href ?? undefined : kitFileUrl(item.file_path) ?? href ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={`group relative flex items-center justify-center overflow-hidden ${compact ? "aspect-[3/2] border-[1.5px] border-hair bg-white" : "aspect-[4/3] bg-tint-sky"}`}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className={`max-h-full max-w-full object-contain transition group-hover:scale-[1.03] ${compact ? "p-4" : "p-4 drop-shadow-[0_6px_14px_rgba(14,35,75,0.18)]"}`}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-sky">
            {textOnly ? <FileText className="h-10 w-10" aria-hidden="true" /> : <Package className="h-10 w-10" aria-hidden="true" />}
          </span>
        )}
        <span className="absolute start-2 top-2 flex gap-1">
          {isFresh && <span className="chip bg-orange text-white">{h.newBadge}</span>}
          {showLang && item.lang !== "both" && <span className="chip bg-white text-navy">{item.lang.toUpperCase()}</span>}
        </span>
      </a>
      )}
      <div className="min-w-0">
        <h3 className="m-0 text-[15px] font-extrabold leading-snug">{title}</h3>
        {desc && !compact && <p className="m-0 mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug text-ink-muted">{desc}</p>}
        {meta && <span className="mt-1 block text-[11.5px] font-bold text-ink-faint">{meta}</span>}
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {format && photoKit && (
          <button type="button" onClick={() => photoKit.edit(format, itemLang)} className="btn-orange h-9 px-3 text-[13px]">
            {hasOwnPhoto ? <Move className="h-4 w-4" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
            {hasOwnPhoto ? h.adjust : h.editPhoto}
          </button>
        )}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" download={!external ? "" : undefined} className="btn-soft h-9 px-3 text-[13px]">
            {external ? <ExternalLink className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {external ? h.open : h.download}
          </a>
        )}
        {caption && (
          <button
            type="button"
            onClick={() => (captionOpen ? copy() : setCaptionOpen(true))}
            className="btn h-9 border-[1.5px] border-hair px-3 text-[13px] text-ink2 hover:border-sky"
            aria-expanded={captionOpen}
          >
            {copied ? <Check className="h-4 w-4 text-sky" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? h.copied : captionOpen ? h.copyCaption : textOnly ? (lang === "es" ? "Ver texto" : "See text") : lang === "es" ? "Ver texto" : "See caption"}
          </button>
        )}
      </div>
      {caption && captionOpen && (
        <p className="m-0 max-h-48 overflow-y-auto whitespace-pre-line bg-tint-gold px-3 py-2.5 text-[13px] font-medium leading-relaxed text-navy">{caption}</p>
      )}
    </article>
  );
}
