import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarHeart, ExternalLink, Megaphone, Newspaper, Package } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import { useMemberCard, type Update, type UpdateItemKind } from "@/lib/hub";
import { countryLabel } from "@/lib/geo";
import { formatDay } from "@/lib/moments";
import Avatar from "./Avatar";

const ITEM_ICON: Record<UpdateItemKind, { icon: typeof Package; color: string }> = {
  kit: { icon: Package, color: "#f37023" },
  ask: { icon: Megaphone, color: "#d81b60" },
  news: { icon: Newspaper, color: "#00a3e0" },
  moment: { icon: CalendarHeart, color: "#c48a00" },
};

/** The weekly update from the team: a short pinned card, the rest one tap away. */
export default function ThisWeek({ update, full = false }: { update: Update; full?: boolean }) {
  const { h, lang, locale } = useHubCopy();
  const [open, setOpen] = useState(full);
  const es = lang === "es";
  const title = (es && update.title_es) || update.title;
  const intro = (es && update.intro_es) || update.intro;
  const items = update.items ?? [];
  const shown = open ? items : items.slice(0, 3);
  const { data: spot } = useMemberCard(open ? update.spotlight_partner_id : null);
  const spotText = (es && update.spotlight_text_es) || update.spotlight_text;
  const more = items.length > 3 || !!update.spotlight_partner_id || (!!intro && !open);

  return (
    <section className="overflow-hidden border-[1.5px] border-hair bg-white">
      <div className="bg-[url('/hub/sky.jpg')] bg-cover bg-[center_35%] px-4 pb-3.5 pt-4">
        <span className="box bg-magenta text-[15px] text-white">{h.thisWeek}</span>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="box bg-white text-lg text-navy">{title}</span>
        </div>
        <span className="mt-2 inline-block bg-white/90 px-2 py-0.5 text-[12px] font-bold text-ink2">
          {formatDay(update.week_start, locale, { day: "numeric", month: "long" })}
        </span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        {open && intro && <p className="m-0 text-[15px] font-medium leading-relaxed text-ink2">{intro}</p>}
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {shown.map((it, i) => {
            const I = ITEM_ICON[it.kind] ?? ITEM_ICON.news;
            const text = (es && it.textEs) || it.text;
            return (
              <li key={i} className="flex gap-3 text-[15px] font-semibold leading-snug text-navy">
                <I.icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: I.color }} aria-hidden="true" />
                <span className="min-w-0">
                  {text}
                  {it.link && (
                    <a href={it.link} target="_blank" rel="noopener noreferrer" className="ms-1.5 inline-flex items-center text-sky-deep">
                      <ExternalLink className="h-3.5 w-3.5" aria-label={h.open} />
                    </a>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        {open && spot && (
          <div className="flex gap-3 bg-tint-gold p-3">
            <Avatar name={spot.name} url={spot.logoUrl} kind={spot.kind} size={44} />
            <div className="min-w-0">
              <div className="text-[12px] font-extrabold text-[#6B4A00]">{h.spotlight}</div>
              <div className="text-[15px] font-extrabold text-navy">{spot.name}</div>
              <div className="text-[12.5px] font-semibold text-ink-muted">{[spot.city, spot.country ? countryLabel(spot.country, lang) : null].filter(Boolean).join(", ")}</div>
              {spotText && <p className="m-0 mt-1.5 text-[14px] font-medium text-ink2">{spotText}</p>}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          {more && !full ? (
            <button type="button" onClick={() => setOpen((o) => !o)} className="btn-quiet">
              {open ? h.showLess : h.readMore}
            </button>
          ) : (
            <span />
          )}
          {!full && (
            <Link to="/updates" className="btn-quiet text-ink-faint">
              {h.pastUpdates}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
