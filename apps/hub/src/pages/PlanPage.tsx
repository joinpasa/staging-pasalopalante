import { useSearchParams } from "react-router-dom";
import { CalendarDays, Columns3, List, Mail } from "lucide-react";
import { cx, EmbedCtx, PageHead } from "@/components/bits";
import { STAGES } from "@/lib/stages";
import CalendarPage from "./CalendarPage";
import EmailsPage from "./EmailsPage";
import PipelinePage from "./PipelinePage";
import PostsPage from "./PostsPage";

const VIEWS = [
  { id: "board", label: "Board", icon: Columns3, page: PipelinePage, sub: "Each card moves left to right as it is made. Drag it on, or open it to work on it." },
  { id: "calendar", label: "Calendar", icon: CalendarDays, page: CalendarPage, sub: "Cards, scheduled posts and emails by day, in Puerto Rico time." },
  { id: "posts", label: "In HighLevel", icon: List, page: PostsPage, sub: "What HighLevel has scheduled and what has gone out. Change a time or caption without opening HighLevel." },
  { id: "emails", label: "Emails", icon: Mail, page: EmailsPage, sub: "Every campaign with opens and clicks. A new email starts as a card, like a post." },
] as const;

type View = (typeof VIEWS)[number]["id"];

/** Plan: every piece of content in one place, seen as a board, a calendar, the HighLevel schedule, or emails. */
export default function PlanPage() {
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get("view"))?.id ?? "board") as View;
  const current = VIEWS.find((v) => v.id === view)!;
  const Page = current.page;

  return (
    <>
      <PageHead
        title="Plan"
        sub="Every post and email, from first idea to gone out. A card made here is checked, approved and then scheduled in HighLevel for you."
        actions={
          <div className="inline-flex max-w-full flex-wrap rounded-[10px] border border-line bg-paper p-0.5" role="tablist" aria-label="How to see the plan">
            {VIEWS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => setParams((p) => {
                  const next = new URLSearchParams(p);
                  next.set("view", id);
                  return next;
                }, { replace: true })}
                className={cx("flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition", view === id ? "bg-white text-navy shadow-[0_1px_2px_rgba(14,35,75,0.12)]" : "text-ink-muted hover:text-navy")}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        }
      />

      {/* the stages every card goes through, so the board's columns read as one journey */}
      {view === "board" && (
        <ol className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-[12.5px] font-semibold text-ink-muted" aria-label="The stages a card goes through">
          {STAGES.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span className={cx("h-3 w-[3px] rounded-full", s.bar)} />
              {s.label}
              {i < STAGES.length - 1 && <span className="px-1 text-ink-faint">→</span>}
            </li>
          ))}
          <li className="ml-2 text-ink-faint">{current.sub}</li>
        </ol>
      )}
      {view !== "board" && <p className="mb-6 text-[13.5px] text-ink-muted">{current.sub}</p>}

      <EmbedCtx.Provider value={true}>
        <Page />
      </EmbedCtx.Provider>
    </>
  );
}
