import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Copy, ExternalLink, Handshake, Link2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { cx, Empty, PageHead, Segmented, StagePill } from "@/components/bits";
import Messages from "@/components/Messages";
import { useAct, useHub, useInbox, useItems, useSuggestions } from "@/lib/hub";
import { changeSpace, introductions, useSpace, type Intro, type WallPost } from "@/lib/space";
import { localDateTime } from "@/lib/time";
import type { Suggestion } from "@/lib/types";
import { hubUrl } from "@/lib/base";

type Entry = { key: string; at: string; done: boolean; from: "team" | "partners" | "space" } & ({ kind: "suggestion"; s: Suggestion } | { kind: "wall"; p: WallPost } | { kind: "intro"; i: Intro });
type Show = "all" | "team" | "partners" | "space";

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast(text);
  }
};

const KIND: Record<string, string> = { story: "Story", date: "Date", idea: "Idea" };

/** Inbox: everything that comes in to the team. Messages and comments from the platforms, and what
 * people send in through the hub itself, each a click from where it belongs. */
export default function InboxPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "sent" ? "sent" : "messages";
  const { data: inbox } = useInbox();
  const { data: suggestions = [] } = useSuggestions();
  const space = useSpace();
  const waitingMessages = (inbox?.threads ?? []).filter((t) => t.waiting).length;
  const waitingSent = suggestions.filter((s) => s.status === "new").length + space.wall.filter((p) => p.status === "waiting").length + introductions(space).filter((i) => !i.done).length;
  const formUrl = hubUrl("/suggest");
  const setView = (v: string) => {
    const next = new URLSearchParams(params);
    next.set("view", v);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHead
        title="Inbox"
        sub="Everything that comes in, in one place: comments on our posts, emails and direct messages, and the ideas, stories and dates people send through the hub. Answer each one here, or send it where it belongs."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={() => copy(formUrl, "Link copied. Share it with the team.")}>
              <Link2 size={15} /> Copy the idea form link
            </button>
            <Link to="/kit" className="btn-ghost">
              The partner page <ExternalLink size={14} />
            </Link>
          </>
        }
      />
      <div className="mb-7">
        <Segmented
          value={view}
          onChange={setView}
          options={
            [
              ["messages", `Messages and comments${waitingMessages ? ` (${waitingMessages})` : ""}`],
              ["sent", `Sent in through the hub${waitingSent ? ` (${waitingSent})` : ""}`],
            ] as const
          }
        />
      </div>
      {view === "messages" ? <Messages /> : <SentIn />}
    </>
  );
}

function SentIn() {
  const [params] = useSearchParams();
  const { data: suggestions = [] } = useSuggestions();
  const space = useSpace();
  const [show, setShow] = useState<Show>((["team", "partners", "space"].includes(params.get("show") ?? "") ? params.get("show") : "all") as Show);
  const [state, setState] = useState<"new" | "done">("new");

  const entries: Entry[] = [
    ...suggestions.map((s): Entry => ({ key: s.id, at: s.at, done: s.status !== "new", from: s.group ? "partners" : "team", kind: "suggestion", s })),
    ...space.wall.map((p): Entry => ({ key: p.id, at: p.at, done: p.status !== "waiting", from: "space", kind: "wall", p })),
    ...introductions(space).map((i): Entry => ({ key: i.key, at: i.at, done: i.done, from: "space", kind: "intro", i })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const open = entries.filter((e) => !e.done);
  const count = (f: Show) => open.filter((e) => f === "all" || e.from === f).length;
  const list = entries.filter((e) => (show === "all" || e.from === show) && e.done === (state === "done"));

  return (
    <>
      <p className="mb-5 max-w-[760px] text-[14px] leading-relaxed text-ink-muted">Ideas from the team, stories and dates from partners and ambassadors, and what comes in through the community space. Each one becomes a card, a story in the bank, or a kind no.</p>

      {/* where each kind of answer goes, so the Inbox reads as the start of the work */}
      <ul className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Make it a card", d: "It joins the Plan as an idea, with who sent it.", to: "/plan" },
          { t: "Save to the story bank", d: "A real moment, kept with its consent for later posts.", to: "/stories" },
          { t: "Show it on the wall", d: "A partner's post goes up for the other partners to see.", to: "/community?tab=space" },
        ].map((x) => (
          <li key={x.t}>
            <Link to={x.to} className="group flex h-full items-start gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-navy/25">
              <ArrowRight size={15} className="mt-[3px] shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-navy" />
              <span>
                <span className="block text-[13.5px] font-bold">{x.t}</span>
                <span className="block text-[13px] leading-snug text-ink-muted">{x.d}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={show}
          onChange={setShow}
          options={
            [
              ["all", `Everything (${count("all")})`],
              ["team", `From the team (${count("team")})`],
              ["partners", `Partners and ambassadors (${count("partners")})`],
              ["space", `Community space (${count("space")})`],
            ] as const
          }
        />
        <Segmented
          value={state}
          onChange={setState}
          options={
            [
              ["new", "Waiting"],
              ["done", "Answered"],
            ] as const
          }
        />
      </div>

      {list.length === 0 ? (
        <Empty title={state === "new" ? "Nothing is waiting here" : "Nothing answered yet"} body={state === "new" ? "New ideas, stories and dates land here as they arrive." : undefined} />
      ) : (
        <ul className="max-w-[920px] border-t border-line">
          {list.map((e) => (
            <li key={e.key} className="border-b border-line py-5">
              {e.kind === "suggestion" && <SuggestionEntry s={e.s} />}
              {e.kind === "wall" && <WallEntry p={e.p} />}
              {e.kind === "intro" && <IntroEntry i={e.i} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Meta({ who, tag, kind, at }: { who: string; tag: string; kind?: string; at: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-muted">
      <span className="font-bold text-ink">{who}</span>
      <span className="rounded bg-paper px-1.5 py-px font-semibold">{tag}</span>
      {kind && <span className="font-semibold">{kind}</span>}
      <span className="text-ink-faint">{localDateTime(at)}</span>
    </p>
  );
}

function SuggestionEntry({ s }: { s: Suggestion }) {
  const { open, openStory } = useHub();
  const act = useAct();
  const { data: items = [] } = useItems();
  const item = items.find((i) => i.id === s.itemId);
  const fromOutside = !!s.group;
  return (
    <>
      <Meta who={s.from} tag={s.group === "partner" ? "Partner" : s.group === "ambassador" ? "Ambassador" : "Team"} kind={KIND[s.kind ?? "idea"]} at={s.at} />
      <p className="mt-2 text-[15px] leading-relaxed">{s.text}</p>
      {s.link && (
        <a href={s.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 break-all text-[13px] font-semibold text-sky-ink hover:underline">
          <Link2 size={13} className="shrink-0" /> {s.link}
        </a>
      )}
      {fromOutside && s.kind === "story" && (
        <p className={cx("mt-2 flex items-center gap-1.5 text-[13px] font-medium", s.consent ? "text-ink-muted" : "text-orange-ink")}>
          <ShieldCheck size={14} /> {s.consent ? "The sender confirmed the people shown agreed to be shared" : "Consent not confirmed yet. Ask before using it."}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {s.status === "new" && (
          <>
            <button
              type="button"
              className="btn-primary h-8 text-[13px]"
              onClick={async () => {
                const it = await act((st) => st.resolveSuggestion(s.id, "accept"), "Added to the Plan as an idea");
                if (it) open(it.id);
              }}
            >
              Make it a card
            </button>
            {s.kind === "story" && (
              <button
                type="button"
                className="btn-ghost h-8 text-[13px]"
                onClick={async () => {
                  const st = await act((x) => x.bankSuggestion(s.id), "Saved to the story bank");
                  if (st) openStory(st.id);
                }}
              >
                Save to the story bank
              </button>
            )}
            <button type="button" className="btn-quiet h-8 text-[13px]" onClick={() => act((st) => st.resolveSuggestion(s.id, "decline"), "Marked as not for now")}>
              <X size={14} /> Not for now
            </button>
          </>
        )}
        {s.status === "accepted" &&
          (item ? (
            <button type="button" onClick={() => open(item.id)} className="flex items-center gap-2 text-[13px] font-semibold text-sky-ink hover:underline">
              In the Plan <StagePill stage={item.stage} />
            </button>
          ) : s.storyId ? (
            <button type="button" onClick={() => openStory(s.storyId!)} className="text-[13px] font-semibold text-sky-ink hover:underline">
              In the story bank
            </button>
          ) : (
            <span className="text-[13px] text-ink-faint">Accepted</span>
          ))}
        {s.status === "declined" && <span className="text-[13px] text-ink-faint">Not for now</span>}
      </div>
    </>
  );
}

function WallEntry({ p }: { p: WallPost }) {
  const decide = (status: WallPost["status"], done: string) => {
    changeSpace((s) => {
      const w = s.wall.find((x) => x.id === p.id);
      if (w) w.status = status;
    });
    toast.success(done);
  };
  return (
    <>
      <Meta who={p.org} tag="Community wall" kind="Post for the other partners" at={p.at} />
      <p className="mt-2 text-[15px] leading-relaxed">{p.text}</p>
      {p.image && <img src={p.image} alt="" className="mt-3 max-h-[180px] rounded-lg object-cover" />}
      <p className={cx("mt-2 flex items-center gap-1.5 text-[13px] font-medium", p.consent ? "text-ink-muted" : "text-orange-ink")}>
        <ShieldCheck size={14} /> {p.consent ? "The sender confirmed the people shown agreed to be shared" : "Consent not confirmed. Fine as words on the wall; ask before using it in a post."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {p.status === "waiting" ? (
          <>
            <button type="button" className="btn-primary h-8 text-[13px]" onClick={() => decide("live", "It is on the wall")}>
              <Check size={14} strokeWidth={2.6} /> Show it on the wall
            </button>
            <button type="button" className="btn-quiet h-8 text-[13px]" onClick={() => decide("declined", "Marked as not for now")}>
              <X size={14} /> Not for now
            </button>
          </>
        ) : (
          <span className="text-[13px] text-ink-faint">{p.status === "live" ? "On the wall" : "Not for now"}</span>
        )}
      </div>
    </>
  );
}

function IntroEntry({ i }: { i: Intro }) {
  const message = `Hello. I would like to introduce ${i.a} and ${i.b}, two Kindness Forward partners. ${i.line} I will let you take it from here, and thank you both for passing kindness forward.`;
  return (
    <>
      <Meta who={`${i.a} and ${i.b}`} tag="Introduction" at={i.at} />
      <p className="mt-2 flex items-start gap-2 text-[15px] leading-relaxed">
        <Handshake size={17} className="mt-[3px] shrink-0 text-sky-ink" /> {i.line}
      </p>
      <p className="mt-1 text-[13px] text-ink-muted">Partners never see each other's contact details. You connect them, in your own name.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {i.done ? (
          <span className="text-[13px] text-ink-faint">Introduced</span>
        ) : (
          <>
            <button type="button" className="btn-primary h-8 text-[13px]" onClick={() => copy(message, "Introduction copied. Paste it into an email to both.")}>
              <Copy size={14} /> Copy an introduction
            </button>
            <button type="button" className="btn-quiet h-8 text-[13px]" onClick={i.mark}>
              <Check size={14} /> Mark as introduced
            </button>
          </>
        )}
      </div>
    </>
  );
}
