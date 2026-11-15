import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, ExternalLink, Search, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cx, Empty, PageHead, Segmented, StagePill, Thumb } from "@/components/bits";
import SpaceDesk from "@/components/SpaceDesk";
import { useAct, useCommunity, useHub, useItems, useKit, useSuggestions } from "@/lib/hub";
import { spaceWaiting, useSpace } from "@/lib/space";
import { localDateTime } from "@/lib/time";
import { hubUrl } from "@/lib/base";

type Tab = "kit" | "space" | "who";
const BAR = "#0086BA";

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast(text);
  }
};

/** Where the team looks after partner organisations and ambassadors. */
export default function CommunityPage() {
  const { data: community } = useCommunity();
  const { data: suggestions = [] } = useSuggestions();
  const { data: kit } = useKit();
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "space" || t === "who" ? t : "kit";
  });
  const space = useSpace();
  if (!community) return null;
  const waiting = suggestions.filter((s) => s.group && s.status === "new").length + spaceWaiting(space);

  return (
    <>
      <PageHead
        title="Community"
        sub="Partners and ambassadors carry the message further than our own accounts can. Each week the team gives them one thing to share, hears back from them, and helps them meet each other."
        actions={
          <>
            <Link to="/kit" target="_blank" className="btn-ghost">
              The kit page <ExternalLink size={14} />
            </Link>
            <Link to="/space" target="_blank" className="btn-ghost">
              The community space <ExternalLink size={14} />
            </Link>
          </>
        }
      />

      {/* how it works, in three steps, each one linked to where it happens */}
      <ol className="grid gap-3 md:grid-cols-3">
        {[
          { n: "1", t: "We send a kit", d: "One finished post a week, in English and Spanish, with the caption written and one clear ask.", to: "?tab=kit", tab: "kit" as Tab, stat: `${kit?.shares ?? 0} said they shared it this week` },
          { n: "2", t: "They share it and write back", d: "Stories, dates and ideas from partners and ambassadors land in your Inbox, ready to become posts.", to: "/inbox?show=partners", stat: waiting ? `${waiting} waiting in the Inbox` : "Nothing waiting in the Inbox" },
          { n: "3", t: "They meet each other", d: "The community space has a noticeboard, a wall with kudos, asks and offers, and shared dates.", to: "?tab=space", tab: "space" as Tab, stat: `${space.wall.filter((p) => p.status === "live").length} posts on the wall` },
        ].map((step) => {
          const body = (
            <>
              <span className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[13px] font-extrabold text-white">{step.n}</span>
                <span className="text-[15px] font-extrabold tracking-[-0.01em]">{step.t}</span>
              </span>
              <span className="mt-2 block text-[13.5px] leading-relaxed text-ink-muted">{step.d}</span>
              <span className="mt-3 block text-[12.5px] font-bold text-sky-ink">{step.stat}</span>
            </>
          );
          return (
            <li key={step.n}>
              {step.tab ? (
                <button type="button" onClick={() => setTab(step.tab!)} className={cx("block h-full w-full rounded-xl border p-4 text-left align-top transition hover:border-navy/25", tab === step.tab ? "border-navy/30 bg-paper" : "border-line")}>
                  {body}
                </button>
              ) : (
                <Link to={step.to} className="block h-full rounded-xl border border-line p-4 transition hover:border-navy/25">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mb-7 mt-8 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={
            [
              ["kit", "This week's kit"],
              ["space", "Community space"],
              ["who", `Who they are (${community.partners.length} partners, ${community.ambassadors.total} ambassadors)`],
            ] as const
          }
        />
      </div>

      {tab === "kit" && <KitTab />}
      {tab === "space" && <SpaceDesk />}
      {tab === "who" && <WhoTab />}
    </>
  );
}

/* ---------------- this week's kit ---------------- */

function KitTab() {
  const { open } = useHub();
  const act = useAct();
  const { data: kit } = useKit();
  const { data: items = [] } = useItems();
  const [askEn, setAskEn] = useState("");
  const [askEs, setAskEs] = useState("");
  useEffect(() => {
    if (kit) {
      setAskEn(kit.askEn);
      setAskEs(kit.askEs);
    }
  }, [kit]);
  const ready = items.filter((i) => i.inKit && ["approved", "scheduled", "posted"].includes(i.stage));
  const waiting = items.filter((i) => i.inKit && !["approved", "scheduled", "posted"].includes(i.stage));
  const url = hubUrl("/kit");
  const dirty = kit && (askEn !== kit.askEn || askEs !== kit.askEs);
  const messageEn = `Hello. This week's kindness kit is ready: ${ready.length} post${ready.length === 1 ? "" : "s"} you can share as they are, with the captions written for you.\n\n${askEn}\n\n${url}\n\nThank you for passing kindness forward.`;
  const messageEs = `Hola. El kit de bondad de esta semana está listo: ${ready.length} ${ready.length === 1 ? "publicación" : "publicaciones"} para compartir tal cual, con los textos ya escritos.\n\n${askEs}\n\n${url}\n\nGracias por pasar la bondad.`;

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-9">
        <section>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">This week's ask</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">One thing, said simply. It sits at the top of the kit page.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ask-en">
                English
              </label>
              <textarea id="ask-en" rows={3} value={askEn} onChange={(e) => setAskEn(e.target.value)} className="field resize-y leading-relaxed" />
            </div>
            <div>
              <label className="label" htmlFor="ask-es">
                Español
              </label>
              <textarea id="ask-es" rows={3} value={askEs} onChange={(e) => setAskEs(e.target.value)} className="field resize-y leading-relaxed" />
            </div>
          </div>
          {dirty && (
            <button type="button" className="btn-primary mt-3" onClick={() => act((s) => s.saveKit({ askEn, askEs }), "The ask is updated")}>
              Save the ask
            </button>
          )}
        </section>

        <section>
          <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Posts in the kit</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">Any card with "Offer it to partners and ambassadors" ticked joins the kit as soon as it is approved.</p>
          {ready.length === 0 ? (
            <div className="mt-4">
              <Empty title="No posts in the kit yet" body="Open an approved card and tick the box to add it." />
            </div>
          ) : (
            <ul className="mt-4 border-t border-line">
              {ready.map((i) => (
                <li key={i.id} className="border-b border-line">
                  <button type="button" onClick={() => open(i.id)} className="flex w-full items-center gap-4 py-3 text-left transition hover:bg-paper">
                    <Thumb item={i} className="h-14 w-14 shrink-0 rounded-lg border border-line" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{i.title}</span>
                      <span className="block truncate text-[13px] text-ink-muted">{i.captionEn.split("\n")[0] || "No caption"}</span>
                    </span>
                    <StagePill stage={i.stage} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {waiting.length > 0 && (
            <p className="mt-3 text-[13px] text-ink-muted">
              {waiting.length} more {waiting.length === 1 ? "card is" : "cards are"} marked for the kit and will join once approved.
            </p>
          )}
        </section>
      </div>

      <aside className="space-y-8">
        <section>
          <h2 className="section-title">The kit page</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">One link for everyone. No login, no app, works on a phone.</p>
          <p className="mt-3 truncate rounded-lg border border-line bg-paper px-3 py-2 text-[13px] font-medium">{url}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => copy(url, "Link copied")}>
              <Copy size={14} /> Copy link
            </button>
            <Link to="/kit" className="btn-ghost flex-1">
              Open it <ExternalLink size={14} />
            </Link>
          </div>
        </section>

        <section>
          <h2 className="section-title">A message to send with it</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">Copy it into WhatsApp or an email. You send it, in your own name.</p>
          {(
            [
              ["English", messageEn],
              ["Español", messageEs],
            ] as const
          ).map(([lang, text]) => (
            <div key={lang} className="mt-3 rounded-lg border border-line">
              <p className="whitespace-pre-line px-3 py-2.5 text-[13px] leading-relaxed">{text}</p>
              <button type="button" className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2 text-[13px] font-semibold text-sky-ink hover:bg-paper" onClick={() => copy(text, `${lang} message copied`)}>
                <Copy size={13} /> Copy the {lang} message
              </button>
            </div>
          ))}
        </section>
      </aside>
    </div>
  );
}

/* ---------------- who they are ---------------- */

function Bars({ rows, more }: { rows: [string, number][]; more?: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <>
      <ul className="mt-3 space-y-2">
        {rows.map(([label, n]) => (
          <li key={label} className="flex items-center gap-3 text-[13px]">
            <span className="w-[132px] shrink-0 truncate text-ink-muted" title={label}>
              {label}
            </span>
            <span className="h-2.5 flex-1">
              <span className="block h-full rounded-r-[4px]" style={{ width: `${(n / max) * 100}%`, background: BAR }} />
            </span>
            <span className="w-8 text-right font-semibold tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
      {more && <p className="mt-2 text-[12.5px] text-ink-faint">{more}</p>}
    </>
  );
}

function WhoTab() {
  const { data: community } = useCommunity();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const cats = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of community?.partners ?? []) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [community]);
  if (!community) return null;
  const shown = community.partners.filter((p) => (cat === "all" || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const countries = community.ambassadors.countries;
  const catCount = cats.length;

  return (
    <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0">
        <h2 className="text-[18px] font-extrabold tracking-[-0.02em]">Partner organisations</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a partner" className="field pl-9" aria-label="Find a partner" />
          </label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="field w-auto pr-8" aria-label="Kind of partner">
            <option value="all">Every kind ({community.partners.length})</option>
            {cats.map(([c, n]) => (
              <option key={c} value={c}>
                {c} ({n})
              </option>
            ))}
          </select>
        </div>
        <ul className="mt-4 grid border-t border-line sm:grid-cols-2 sm:gap-x-8">
          {shown.map((p) => (
            <li key={p.name} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-[13.5px]">
              <span className="min-w-0 truncate font-medium">{p.name}</span>
              <span className="shrink-0 text-[12.5px] text-ink-faint">{p.category === "Government" ? "Municipality" : p.category}</span>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="py-6 text-[14px] text-ink-muted">No partner matches that.</p>}
      </section>

      <aside className="space-y-9">
        <section>
          <h2 className="section-title">Partners by kind</h2>
          <Bars rows={cats} />
          {community.rawCategories > catCount && (
            <p className="mt-3 border-l-2 border-sun pl-3 text-[13px] leading-relaxed text-ink-muted">
              The source sheet spells these {catCount} kinds in {community.rawCategories} different ways. The hub groups them here. Tidying the sheet once would make every report read the same.
            </p>
          )}
        </section>
        <section>
          <h2 className="section-title">Ambassadors by country</h2>
          <Bars rows={countries.slice(0, 8)} more={countries.length > 8 ? `and ${countries.length - 8} more countries` : undefined} />
        </section>
        <section>
          <h2 className="section-title">How ambassadors describe themselves</h2>
          <Bars rows={community.ambassadors.roles} />
        </section>
        <p className="text-[12.5px] leading-relaxed text-ink-faint">Read from the public partner list and ambassador directory on 11 November 2026. The hub keeps counts only for ambassadors, not names or contact details.</p>
      </aside>
    </div>
  );
}
