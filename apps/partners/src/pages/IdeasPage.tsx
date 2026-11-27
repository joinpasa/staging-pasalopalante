import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Check, ChevronRight, Heart } from "lucide-react";
import Shell from "@/components/Shell";
import { useHubCopy } from "@/lib/hubCopy";
import { useMe } from "@/lib/hub";
import { challengeOfWeek, ideaWords, IDEAS } from "@/lib/ideas";
import { seasonMoments, worldDays } from "@/lib/events";

/**
 * Ideas (25 Nov 2026): this week's challenge on a sunny banner and simple ideas for this kind of
 * member. "I did it" and "Log it" open the act form with the idea filled in. The days coming up
 * moved to the Events tab on 27 Nov 2026; one line here points to the next one.
 */
export default function IdeasPage() {
  const { h, lang } = useHubCopy();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [cTitle, cBody] = ideaWords(challengeOfWeek(), lang);
  // the very next day worth planning for: a season moment or an international day
  const next = [...seasonMoments(lang).filter((d) => d.days >= 0), ...worldDays(lang)].sort((a, b) => a.days - b.days)[0];
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

        {/* the days worth planning for live in Events now; one line points there */}
        {next && (
          <Link to="/events" className="-mt-3 flex items-center gap-3 border-[1.5px] border-hair px-4 py-3 no-underline hover:border-sky">
            <CalendarDays className="h-5 w-5 shrink-0 text-sky" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-ink2">
              <b className="font-extrabold text-navy">{next.title}</b> · {h.inDays(next.days)}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-sky-deep">
              <span className="hidden sm:inline">{h.seeAllEvents}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        )}

        {/* ideas for this kind of member */}
        <section className="flex flex-col gap-3">
          <h2 className="h-section flex items-center gap-2">
            <Heart className="h-5 w-5 text-orange" aria-hidden="true" />
            {h.ideasForYou}
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
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
    </Shell>
  );
}
