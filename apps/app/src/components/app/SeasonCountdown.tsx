import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

// Puerto Rico is AST (UTC-4) year-round, no DST — same dates MyCommitment
// already tracks for the pre-season countdown, plus a season-end date for
// this card so it stays meaningful for the whole season, not just before it.
const SEASON_START = new Date("2026-11-01T00:00:00-04:00");
const SEASON_END = new Date("2027-01-31T23:59:59-04:00");

function timeLeftTo(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/**
 * Dashboard's dark "Global Kindness Season" card — separated out from
 * MyCommitment's pledge/progress card per the redesign, so the two don't
 * compete for the same space. Counts down to the season's start, then to
 * its end once underway, rather than only ever counting to the start like
 * the countdown this replaced on the commitment card did.
 */
export default function SeasonCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target =
    now < SEASON_START.getTime() ? SEASON_START : now < SEASON_END.getTime() ? SEASON_END : null;
  const left = target ? timeLeftTo(target) : null;

  return (
    <section className="flex flex-shrink-0 flex-col gap-3.5 rounded-[20px] bg-app-ink p-[18px]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-app-gold">
            Global Kindness Season
          </p>
          <p className="mt-1 text-xs text-app-surface/65">Nov 1, 2026 – Jan 31, 2027</p>
        </div>
        <Heart className="h-5 w-5 shrink-0 fill-app-gold text-app-gold" />
      </div>

      {left ? (
        <>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { v: left.days, l: "DAYS" },
              { v: left.hours, l: "HRS" },
              { v: left.minutes, l: "MIN" },
              { v: left.seconds, l: "SEC" },
            ].map((u) => (
              <div key={u.l} className="rounded-2xl bg-app-surface/10 px-1 py-3.5 text-center">
                <p className="text-2xl font-extrabold tabular-nums text-app-surface">
                  {String(u.v).padStart(2, "0")}
                </p>
                <p className="mt-0.5 text-[10px] tracking-[0.06em] text-app-surface/60">{u.l}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] italic text-app-surface/50">
            In Puerto Rico time — where the wave began.
          </p>
        </>
      ) : (
        <p className="text-[12.5px] leading-relaxed text-app-surface/75">
          This year's Global Kindness Season has wrapped — thank you for passing it forward.
        </p>
      )}
    </section>
  );
}
