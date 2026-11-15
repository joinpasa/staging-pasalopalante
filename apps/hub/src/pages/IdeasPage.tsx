import { useState } from "react";
import { Link } from "react-router-dom";
import { ThumbsUp } from "lucide-react";
import { cx, PageHead, Segmented } from "@/components/bits";

type Status = "preview" | "next" | "later";
type Size = "Small" | "Medium" | "Large";

interface Idea {
  id: string;
  name: string;
  what: string;
  /** what is true today, so the idea is judged against the real starting point */
  today?: string;
  status: Status;
  size: Size;
  to?: string;
}

const GROUPS: { title: string; sub: string; bar: string; ideas: Idea[] }[] = [
  {
    title: "For people who pledge",
    sub: "A pledge is the start of a conversation. Today the conversation mostly stops there.",
    bar: "bg-orange",
    ideas: [
      { id: "thanks-ask", name: "A thank-you page that asks one thing", what: "Right after a pledge: a card with their name to share, and three friends to invite, while the feeling is fresh.", today: "The page says thank you and asks them to check their inbox.", status: "next", size: "Small" },
      { id: "welcome", name: "A welcome email worth opening", what: "Their pledge in their own words, one idea to start with today, and their personal link to pass on.", today: "The only email is a sign-in link, and it does not mention the pledge.", status: "next", size: "Small" },
      { id: "did-you", name: "Did you do it?", what: "Three days later, one question and one tap to say yes. A yes becomes a logged act and an invitation to tell the story.", status: "next", size: "Medium" },
      { id: "reminders", name: "A weekly nudge people choose", what: "One small act suggested each week, by email or text, for anyone who opts in.", today: "Streak reminders are a waiting list.", status: "next", size: "Medium" },
      { id: "ripple", name: "Your ripple, once a month", what: "How far their kindness has travelled: who joined through them, and where in the world.", today: "The app already counts this. Nobody is told unless they open it.", status: "later", size: "Medium" },
      { id: "anniversary", name: "A note on the day they pledged", what: "One year on, a thank-you and an invitation to pledge again.", status: "later", size: "Small" },
    ],
  },
  {
    title: "For partners and ambassadors",
    sub: "They carry the message further than our own accounts can.",
    bar: "bg-sky",
    ideas: [
      { id: "space", name: "A community space", what: "A noticeboard, a wall with kudos, asks and offers, shared dates and a directory, so partners meet each other.", status: "preview", size: "Large", to: "/space" },
      { id: "kit", name: "The weekly kit", what: "Finished posts in English and Spanish, captions ready to copy, one clear ask.", status: "preview", size: "Medium", to: "/kit" },
      { id: "partner-preview", name: "See a post about you before it goes out", what: "A private link with one button: looks good, or please change this.", status: "next", size: "Small" },
      { id: "partner-results", name: "What your sharing did", what: "Pledges that came through each partner's own link, next to the posts they shared.", status: "next", size: "Medium" },
      { id: "thank-cards", name: "Thank-you cards that arrive by themselves", what: "A card with their name at the first share, and at 5, 10 and 25.", status: "later", size: "Small" },
      { id: "translators", name: "Ambassador translators", what: "Ambassadors in 40 countries offer a caption in their language, and the team approves it.", status: "later", size: "Medium" },
    ],
  },
  {
    title: "For the team",
    sub: "Less time arranging, more time making.",
    bar: "bg-sun",
    ideas: [
      { id: "email-builder", name: "The weekly email, built from the week", what: "Tick the cards and stories that belong in Friday's email. The hub lays them out in both languages for a last read.", status: "next", size: "Medium" },
      { id: "post-maker", name: "Post maker", what: "A story from the bank becomes an on-brand image or carousel, with the official logo and Montserrat already in place.", status: "next", size: "Large" },
      { id: "moment", name: "Moment planner", what: "Enter one date, such as Giving Tuesday, and get the whole countdown as cards: teaser, day before, the day, the thank-you.", status: "next", size: "Medium" },
      { id: "monday", name: "A Monday page for the directors", what: "One screen: what went out, what it did, what is coming, and what needs a decision.", status: "next", size: "Small" },
      { id: "not-featured", name: "Who have we not featured yet", what: "Partners and countries that have never appeared in a post, so the spotlight keeps moving.", status: "later", size: "Small" },
      { id: "mission", name: "Mission control for live moments", what: "On a day like 11.11: what is scheduled, what is live, what people are saying, on one screen.", status: "later", size: "Large" },
      { id: "speak", name: "Speak an idea", what: "A voice note on a phone becomes a card in Ideas, written up and ready to claim.", status: "later", size: "Small" },
    ],
  },
  {
    title: "For being found",
    sub: "So the next person who searches for kindness finds a way in.",
    bar: "bg-rose",
    ideas: [
      { id: "tracked", name: "Pledges next to posts", what: "Every card gets its own link, so Results can say which post, email or partner brought a pledge.", today: "The site counts visits, but not which post led to a pledge.", status: "next", size: "Medium" },
      { id: "search-health", name: "A search health page", what: "Every page of the website with its title, description and share picture, and a plain note on what is missing.", status: "next", size: "Medium" },
      { id: "story-pages", name: "Stories with pages of their own", what: "A story approved in the hub becomes a page on the website that people can find and share.", today: "Stories on the Wall have no address of their own.", status: "later", size: "Large" },
      { id: "partner-pages", name: "A page for every partner", what: "Each partner's acts, photos and people on one public page they are proud to link to.", status: "later", size: "Large" },
      { id: "map", name: "The kindness map, by partner", what: "The map shows which partners are active where, and links to their page.", status: "later", size: "Medium" },
    ],
  },
];

const STATUS: Record<Status, [string, string]> = {
  preview: ["In this preview", "bg-sky-soft text-sky-ink"],
  next: ["Next", "bg-orange-soft text-orange-ink"],
  later: ["Later", "bg-paper text-ink-muted"],
};

const KEY = "kindness-hub-ideas-v1";
const loadVotes = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
};

/** What the hub could do next. The team says which ideas matter by voting. */
export default function IdeasPage() {
  const [votes, setVotes] = useState<string[]>(loadVotes);
  const [show, setShow] = useState<"all" | Status>("all");
  const toggle = (id: string) => {
    const next = votes.includes(id) ? votes.filter((v) => v !== id) : [...votes, id];
    setVotes(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // the vote still shows until the page is reloaded
    }
  };
  const total = GROUPS.reduce((n, g) => n + g.ideas.length, 0);

  return (
    <>
      <PageHead
        title="What's next"
        sub={`${total} ideas for where the hub goes from here, grouped by who they are for. Tap the ones you would use, so we build the right thing first.`}
        actions={
          <Link to="/suggest" className="btn-ghost">
            Add an idea of your own
          </Link>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Segmented
          value={show}
          onChange={setShow}
          options={
            [
              ["all", "Everything"],
              ["preview", "In this preview"],
              ["next", "Next"],
              ["later", "Later"],
            ] as const
          }
        />
        {votes.length > 0 && (
          <p className="text-[13px] text-ink-muted">
            You picked <span className="font-bold text-ink">{votes.length}</span>
          </p>
        )}
      </div>

      <div className="space-y-12">
        {GROUPS.map((g) => {
          const ideas = g.ideas.filter((i) => show === "all" || i.status === show);
          if (!ideas.length) return null;
          return (
            <section key={g.title}>
              <h2 className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-[-0.02em]">
                <span className={cx("h-5 w-[5px] rounded-full", g.bar)} />
                {g.title}
              </h2>
              <p className="mt-1 text-[14px] text-ink-muted">{g.sub}</p>
              <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ideas.map((i) => {
                  const mine = votes.includes(i.id);
                  const [label, tone] = STATUS[i.status];
                  return (
                    <li key={i.id} className="flex flex-col rounded-xl border border-line p-5">
                      <p className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold">
                        <span className={cx("rounded px-1.5 py-px", tone)}>{label}</span>
                        <span className="font-semibold text-ink-faint">{i.size} to build</span>
                      </p>
                      <h3 className="mt-2.5 text-[16.5px] font-extrabold leading-snug tracking-[-0.01em]">{i.name}</h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{i.what}</p>
                      {i.today && (
                        <p className="mt-3 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ink-faint">
                          <span className="font-semibold text-ink-muted">Today:</span> {i.today}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                        <button type="button" aria-pressed={mine} onClick={() => toggle(i.id)} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition", mine ? "border-navy bg-navy text-white" : "border-line text-ink-muted hover:border-navy/40 hover:text-navy")}>
                          <ThumbsUp size={13} strokeWidth={2.4} /> {mine ? "You would use this" : "I would use this"}
                        </button>
                        {i.to && (
                          <Link to={i.to} className="text-[13px] font-semibold text-sky-ink hover:underline">
                            See it
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
