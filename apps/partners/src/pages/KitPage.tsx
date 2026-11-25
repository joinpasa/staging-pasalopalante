import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText } from "lucide-react";
import Shell from "@/components/Shell";
import { useHubCopy } from "@/lib/hubCopy";
import { isNew, kitFileUrl, useKit, useMe, type KitItem } from "@/lib/hub";
import MadeForYou from "@/components/MadeForYou";
import { kitAudienceMatches } from "@/lib/kinds";

const SECTION_ORDER = ["start", "social", "profile", "print", "email", "logos", "video", "other"] as const;

/** The kit: the pictures made with their logo first, then everything else in plain sections. */
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
  const sections = SECTION_ORDER.map((s) => ({ id: s, items: mine.filter((k) => k.section === s) })).filter((s) => s.items.length);

  return (
    <Shell wide>
      <div className="flex flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="h-page">{h.kitTitle}</h1>
            <p className="m-0 mt-1 text-[15px] font-medium text-ink-muted">{h.kitSub}</p>
          </div>
          <div className="flex border-[1.5px] border-hair" role="group">
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

        {me && <MadeForYou me={me} lang={show === "es" ? "es" : show === "en" ? "en" : lang} />}

        {isLoading && <div className="h-56 animate-pulse bg-tint-sky/60" />}
        {!isLoading && sections.length === 0 && <p className="m-0 bg-tint-sky px-4 py-6 text-center font-semibold text-ink2">{h.kitEmpty}</p>}

        {sections.map((s) => (
          <section key={s.id} className="flex flex-col gap-3">
            <h2 className="h-section">{h.kitSections[s.id] ?? s.id}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {s.items.map((k) => (
                <KitCard key={k.id} item={k} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function KitCard({ item }: { item: KitItem }) {
  const { h, lang } = useHubCopy();
  const [copied, setCopied] = useState(false);
  const title = (lang === "es" && item.title_es) || item.title;
  const desc = (lang === "es" && item.description_es) || item.description;
  const caption = (lang === "es" && item.caption_es) || item.caption;
  const fileUrl = kitFileUrl(item.file_path);
  const thumb = kitFileUrl(item.thumb_path) ?? (item.mime?.startsWith("image/") ? fileUrl : null);
  const href = fileUrl ? `${fileUrl}${fileUrl.includes("?") ? "&" : "?"}download=` : item.url;
  const isLink = !item.file_path && !!item.url && !item.url.startsWith("/") && !item.url.startsWith("blob:") && !/\.(png|jpe?g|webp)$/i.test(item.url);
  const kindTag = item.mime?.includes("pdf") ? "PDF" : item.mime?.includes("zip") ? "ZIP" : item.mime?.startsWith("video/") ? "Video" : item.mime?.startsWith("image/") ? (item.width ? `${item.width}×${item.height}` : "PNG") : null;

  async function copy() {
    if (!caption) return;
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      /* the button still shows the text below */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="flex min-w-0 flex-col gap-2">
      <a href={href ?? undefined} target="_blank" rel="noopener noreferrer" className="relative flex aspect-square items-center justify-center overflow-hidden bg-tint-sky">
        {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-contain p-3" /> : <FileText className="h-10 w-10 text-sky" aria-hidden="true" />}
        {isNew(item.added_at) && <span className="chip absolute start-2 top-2 bg-orange text-white">{h.newBadge}</span>}
      </a>
      <div className="min-w-0">
        <h3 className="m-0 text-[15px] font-extrabold leading-snug">{title}</h3>
        {desc && <p className="m-0 mt-0.5 line-clamp-2 text-[13px] font-medium text-ink-muted">{desc}</p>}
        {kindTag && <span className="mt-1 block text-[11.5px] font-bold text-ink-faint">{kindTag}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" download={!isLink ? "" : undefined} className="btn-soft h-9 px-3 text-[13px]">
            {isLink ? <ExternalLink className="h-4 w-4" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {isLink ? h.open : h.download}
          </a>
        )}
        {caption && (
          <button type="button" onClick={copy} className="btn h-9 border-[1.5px] border-hair px-3 text-[13px] text-ink2 hover:border-sky">
            {copied ? <Check className="h-4 w-4 text-sky" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? h.copied : h.copyCaption}
          </button>
        )}
      </div>
    </article>
  );
}
