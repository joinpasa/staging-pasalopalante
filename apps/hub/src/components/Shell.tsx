import { signOut } from "@/pages/SignInPage";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BookOpen, CalendarRange, Clapperboard, HeartHandshake, Home, Images, Inbox, Lightbulb, Plus, Settings, TrendingUp, Globe2 } from "lucide-react";
import { Avatar, cx, PauseMark } from "./bits";
import { useAct, useHub, useInbox, useItems, useMe, useMembers, useSuggestions, useTasks } from "@/lib/hub";
import { spaceWaiting, useSpace } from "@/lib/space";
import { prDateKey } from "@/lib/time";
import { asset } from "@/lib/base";

type Badge = "plan" | "inbox" | "growth";
type NavItem = { to: string; label: string; hint: string; icon: typeof Home; end?: boolean; badge?: Badge };

// The order follows the work: what comes in, what gets made, who carries it, and what it did.
const MAIN: NavItem[] = [
  { to: "/", label: "Home", hint: "This week at a glance", icon: Home, end: true },
  { to: "/inbox", label: "Inbox", hint: "Messages, comments and ideas sent in", icon: Inbox, badge: "inbox" },
  { to: "/plan", label: "Plan", hint: "Every post, from idea to live", icon: CalendarRange, badge: "plan" },
  { to: "/stories", label: "Story bank", hint: "Real moments, with consent", icon: Images },
  { to: "/videos", label: "Videos", hint: "Every video, sorted and ready to use", icon: Clapperboard },
  { to: "/community", label: "Community", hint: "Partners and ambassadors", icon: HeartHandshake },
  { to: "/partners-hub", label: "Partners Hub", hint: "Members' posts, weekly update, kit", icon: Globe2 },
  { to: "/growth", label: "Growth", hint: "Reach work and results", icon: TrendingUp, badge: "growth" },
];
const MORE: NavItem[] = [
  { to: "/library", label: "Brand", hint: "", icon: BookOpen },
  { to: "/ideas", label: "What's next", hint: "", icon: Lightbulb },
  { to: "/settings", label: "Settings", hint: "", icon: Settings },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { store, open } = useHub();
  const act = useAct();
  const space = useSpace();
  const { data: me } = useMe();
  const { data: members = [] } = useMembers();
  const { data: suggestions = [] } = useSuggestions();
  const { data: inbox } = useInbox();
  const { data: items = [] } = useItems();
  const { data: tasks = [] } = useTasks();
  const today = prDateKey(new Date().toISOString());
  const counts: Record<Badge, number> = {
    inbox: suggestions.filter((s) => s.status === "new").length + spaceWaiting(space) + (inbox?.threads ?? []).filter((t) => t.waiting).length,
    // cards waiting on this person: reviews for approvers, anything sent back for its owner
    plan: items.filter((i) => (i.stage === "review" && me && me.role !== "member" && (i.ownerId !== me.id || me.role === "admin")) || (!!i.needsChanges && i.ownerId === me?.id)).length,
    // this person's growth work that is due and not done
    growth: tasks.filter((t) => !t.done && t.ownerId === me?.id && t.day <= today).length,
  };

  const path = useLocation().pathname;
  // the board, the calendar and the week are wide by nature, so they get more of the window
  const wide = ["/plan", "/growth"].includes(path);

  const newPost = async () => {
    const item = await act((s) => s.createItem({ stage: "planning", ownerId: me?.id }));
    if (item) open(item.id);
  };

  const link = ({ to, label, hint, icon: Icon, end, badge }: NavItem, big: boolean) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      title={hint || undefined}
      className={({ isActive }) =>
        cx(
          "group flex shrink-0 items-center gap-3 rounded-[10px] px-3 transition",
          big ? "h-10 text-[14px]" : "h-8 text-[13px]",
          isActive ? "bg-white font-bold text-navy shadow-[0_0_0_1px_#E4E1D9,0_1px_2px_rgba(14,35,75,0.06)]" : "font-semibold text-ink-muted hover:bg-white/70 hover:text-navy",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={big ? 17 : 15} strokeWidth={isActive ? 2.4 : 2} className="shrink-0" />
          <span className="whitespace-nowrap">{label}</span>
          {badge && counts[badge] > 0 ? (
            <span className={cx("ml-auto min-w-[22px] rounded-full px-1.5 text-center text-[11.5px] font-bold leading-[20px] tabular-nums text-white", badge === "inbox" ? "bg-orange-ink" : "bg-navy")} title={badge === "inbox" ? "New in the Inbox" : badge === "plan" ? "Cards waiting on you" : "Your growth work due"}>
              {counts[badge]}
            </span>
          ) : (
            isActive && <PauseMark className="ml-auto hidden h-3 md:inline-flex" />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      {/* side navigation (a scrolling row on phones) */}
      <aside className="z-20 border-b border-line bg-paper md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r">
        <Link to="/" className="flex items-center gap-2.5 px-5 pb-1 pt-5">
          <img src={asset("kf-logo.webp")} alt="Kindness Forward" className="h-8 w-auto" />
        </Link>
        <p className="flex items-center gap-2 px-5 pb-5 pt-2 text-[13px] font-bold">
          <PauseMark className="h-3.5" /> Kindness Hub
          {store.mode === "demo" && <span className="ml-auto rounded bg-sun-soft px-1.5 py-0.5 text-[11px] font-bold text-sun-ink">Preview</span>}
        </p>

        <nav className="scroll-x flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-0.5 md:overflow-y-auto md:pb-4">
          {MAIN.map((n) => link(n, true))}
          <div className="hidden pt-6 md:block">
            <p className="px-3 pb-1 text-[11.5px] font-semibold text-ink-faint">More</p>
            {MORE.map((n) => link(n, false))}
          </div>
          <div className="flex gap-1 md:hidden">{MORE.map((n) => link(n, false))}</div>
        </nav>

        <div className="hidden items-center gap-2.5 border-t border-line px-4 py-3 md:flex">
          <Avatar member={me} size={30} />
          <div className="min-w-0 flex-1">
            {store.mode === "demo" ? (
              <>
                <label htmlFor="view-as" className="block text-[11.5px] font-semibold text-ink-faint">
                  Viewing as
                </label>
                <select id="view-as" value={me?.id ?? ""} onChange={(e) => act((s) => s.setMe(e.target.value))} className="-ml-1 w-full cursor-pointer truncate rounded bg-transparent text-[13px] font-bold outline-none">
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}, {m.role}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <p className="truncate text-[13px] font-bold">{me?.name}</p>
                <p className="text-[12px] font-medium text-ink-faint">
                  <span className="capitalize">{me?.role}</span>
                  <button type="button" className="ml-2 font-semibold text-ink-muted underline-offset-2 hover:underline" onClick={() => void signOut()}>
                    Sign out
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-5 backdrop-blur md:px-10">
          {store.mode === "demo" && <p className="min-w-0 truncate text-[12.5px] font-medium text-ink-faint">Real accounts, posts and results from HighLevel, read on 15 November. Nothing here is posted or sent.</p>}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link to="/suggest" className="btn-quiet hidden sm:inline-flex">
              Suggest an idea
            </Link>
            <button type="button" onClick={newPost} className="btn-primary">
              <Plus size={16} strokeWidth={2.6} /> New post
            </button>
          </div>
        </header>
        <main className={cx("mx-auto px-5 py-8 md:px-10 md:py-10", wide ? "max-w-[1560px]" : "max-w-[1280px]")}>{children}</main>
      </div>
    </div>
  );
}
