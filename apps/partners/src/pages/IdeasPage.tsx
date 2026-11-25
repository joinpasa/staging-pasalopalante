import { Link, useNavigate } from "react-router-dom";
import { CalendarHeart, Check, Heart, Package } from "lucide-react";
import Shell from "@/components/Shell";
import { useHubCopy } from "@/lib/hubCopy";
import { useMe } from "@/lib/hub";
import { challengeOfWeek, ideaWords, IDEAS, upcomingDays } from "@/lib/ideas";
import { formatDay } from "@/lib/moments";

/**
 * Ideas (25 Nov 2026): this week's challenge on a sunny banner, the days coming up, and simple
 * ideas for this kind of member. "I did it" and "Log it" open the act form with the idea filled in.
 */
export default function IdeasPage() {
  const { h, lang, locale } = useHubCopy();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [cTitle, cBody] = ideaWords(challengeOfWeek(), lang);
  const days = upcomingDays(lang, 5);
  const ideas = IDEAS[me?.kind ?? "organisation"];
  const log = (text: string) => navigate("/log", { state: { prefill: text } });

  return (
    <Shell wide>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="h-page">{h.ideasTitle}</h1>
          <p className="m-0 mt-1 text-[15px] font-medium text-ink-muted">{h.ideasSub}</p>
        </div>

        {/* this week's challenge */}
        <section className="relative overflow-hidden bg-[#8fd3f2] bg-[url('/hub/sky.jpg')] bg-cover bg-[center_40%]">
          <div className="flex flex-col items-start gap-2.5 px-5 py-6 sm:px-7 sm:py-8">
            <span className="box bg-magenta text-[14px] text-white">{h.challenge}</span>
            <span className="box max-w-full bg-white text-[22px] leading-tight text-navy sm:text-[28px]">{cTitle}</span>
            <p className="m-0 max-w-[560px] bg-white/90 px-3 py-2 text-[15px] font-semibold leading-snug text-navy">{cBody}</p>
            <button type="button" onClick={() => log(cTitle)} className="btn-orange mt-1 h-11 px-4">
              <Check className="h-5 w-5" aria-hidden="true" />
              {h.didIt}
            </button>
          </div>
          <div className="h-2 bg-bar" aria-hidden="true" />
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          {/* coming up */}
          <section className="flex flex-col gap-3">
            <h2 className="h-section flex items-center gap-2">
              <CalendarHeart className="h-5 w-5 text-sky" aria-hidden="true" />
              {h.comingUp}
            </h2>
            <ol className="m-0 flex list-none flex-col p-0">
              {days.map((d) => {
                const date = new Date(`${d.date}T12:00:00`);
                return (
                  <li key={`${d.date}-${d.title}`} className="flex gap-4 border-b-[1.5px] border-hair py-3.5 last:border-b-0">
                    <span className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center ${d.season ? "bg-tint-gold text-[#8a6100]" : "bg-tint-sky text-sky-deep"}`}>
                      <b className="text-[20px] font-extrabold leading-none">{date.getDate()}</b>
                      <span className="mt-0.5 text-[11px] font-bold">{date.toLocaleDateString(locale, { month: "short" }).replace(".", "")}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <b className="text-[15px] font-extrabold leading-snug text-navy">{d.title}</b>
                        {d.season && <span className="chip bg-gold text-navy">{h.seasonTag}</span>}
                      </span>
                      {d.idea && <span className="mt-0.5 block text-[13.5px] font-medium leading-snug text-ink-muted">{d.idea}</span>}
                      <span className="mt-1 block text-[12px] font-bold text-ink-faint">
                        {h.inDays(d.days)} · {formatDay(d.date, locale, { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
            <Link to="/kit" className="btn-soft h-10 w-fit px-3 text-sm">
              <Package className="h-4 w-4" aria-hidden="true" />
              {h.findPost}
            </Link>
          </section>

          {/* ideas for this kind of member */}
          <section className="flex flex-col gap-3">
            <h2 className="h-section flex items-center gap-2">
              <Heart className="h-5 w-5 text-orange" aria-hidden="true" />
              {h.ideasForYou}
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
              {ideas.map((idea) => {
                const [title, body] = ideaWords(idea, lang);
                return (
                  <li key={idea.en[0]} className="flex flex-col gap-2 border-[1.5px] border-hair p-4">
                    <span className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-tint-orange text-orange">
                        <idea.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <b className="block text-[15px] font-extrabold leading-snug text-navy">{title}</b>
                        <span className="mt-0.5 block text-[13.5px] font-medium leading-snug text-ink-muted">{body}</span>
                      </span>
                    </span>
                    <button type="button" onClick={() => log(title)} className="btn-quiet mt-auto w-fit self-end text-[13px]">
                      <Heart className="h-4 w-4" aria-hidden="true" />
                      {h.logIt}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </Shell>
  );
}
