import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LayoutGrid, HeartHandshake } from "lucide-react";

import PasaMark from "@/components/app/PasaMark";
import JoinGate from "@/components/app/JoinGate";
import ReactionButton from "@/components/app/ReactionButton";
import { useAuth } from "@shared/contexts/AuthContext";
import {
  useActReactions,
  useActsReceivedByMe,
  useAppBadges,
  useAppMe,
  useMovementTotals,
  useMyRecentActs,
  useSendThanks,
  useThanksForActs,
} from "@/hooks/useAppData";
import { actEmoji, modeLabel, timeAgo } from "@shared/lib/appActs";
import { cn } from "@shared/lib/utils";

const nf = new Intl.NumberFormat("en-US");
const GOAL = 1_000_000_000;

export default function AppHome() {
  const { user } = useAuth();
  const { data: me } = useAppMe();
  const { data: totals } = useMovementTotals();
  const { data: myActs } = useMyRecentActs();
  const { data: badges } = useAppBadges();
  const { data: receivedActs } = useActsReceivedByMe();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const myActIds = (myActs ?? []).map((a) => a.id);
  const { reactions, toggle } = useActReactions(myActIds);
  const { data: thankedActs } = useThanksForActs([
    ...myActIds,
    ...(receivedActs ?? []).map((a) => a.id),
  ]);
  const sendThanks = useSendThanks();
  const [justThanked, setJustThanked] = useState<Set<string>>(new Set());

  // Someone scanned a pass QR (pasalopalante.com/app?ref=<code>). If the app
  // is installed (running standalone), stay here. If not, send them to join
  // so they can sign up / install — preserving the referral code. Only fires
  // when a `ref` is present (i.e. a scan), so the Home tab still works in-browser.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!standalone) {
      navigate(`/join?ref=${encodeURIComponent(ref)}`, { replace: true });
    }
  }, [navigate, searchParams]);


  const handleSendThanks = async (actId: string) => {
    setJustThanked((prev) => new Set(prev).add(actId));
    const { error } = await sendThanks(actId);
    if (error) {
      setJustThanked((prev) => {
        const next = new Set(prev);
        next.delete(actId);
        return next;
      });
    }
  };

  const earned = (badges ?? []).filter((b) => b.earned).slice(0, 6);
  const actsAllTime = totals?.actsAllTime ?? 0;
  const progress = Math.min((actsAllTime / GOAL) * 100, 100);
  const greetingName = me?.firstName ?? (user ? "friend" : "there");

  return (
    <div className="space-y-5 px-5 pt-5">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-coral-tint">
          <PasaMark className="h-7 w-7" tile={false} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-sans text-lg font-bold leading-tight text-foreground">
            Hola, {greetingName}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {me?.place ?? "Pásalo Pa'lante"}
          </p>
        </div>
        {user ? (
          <Link
            to="/account"
            className="rounded-full border border-border bg-app-surface px-2.5 py-1.5 text-xs font-semibold text-foreground"
          >
            Account
          </Link>
        ) : (
          <Link
            to="/join"
            className="rounded-full bg-app-coral px-3 py-1.5 text-xs font-semibold text-app-surface"
          >
            Join
          </Link>
        )}
      </header>

      {!user && <JoinGate />}

      <section className="relative overflow-hidden rounded-3xl bg-app-coral p-6 text-app-surface">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-app-surface/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-app-surface/80">
          {user ? "Your kindness" : "The movement"}
        </p>
        <div className="relative mt-1 flex items-end gap-3">
          <span className="font-sans text-6xl font-extrabold leading-none tracking-tight">
            {nf.format(user ? (me?.actsPassedForward ?? 0) : actsAllTime)}
          </span>
          <span className="max-w-[7rem] pb-1 text-sm font-semibold leading-snug">
            acts passed forward
          </span>
        </div>
        <div className="relative mt-5 border-t border-app-surface/25 pt-3">
          <div className="flex items-baseline justify-between text-sm font-medium">
            <span>Toward 1 billion</span>
            <span className="font-semibold">{nf.format(totals?.actsToday ?? 0)} today</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-app-surface/25">
            <div
              className="h-full rounded-full bg-app-surface"
              style={{ width: `${Math.max(progress, 1.5)}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {(user
          ? [
              { value: me?.dayStreak ?? 0, label: "Day streak" },
              { value: me?.pledged ?? 0, label: "Acts you pledged" },
              { value: me?.peoplePassedTo ?? 0, label: "People you passed to" },
            ]
          : [
              { value: totals?.pledged ?? 0, label: "Acts pledged" },
              { value: totals?.actsToday ?? 0, label: "Logged today" },
              { value: actsAllTime, label: "Acts all time" },
            ]
        ).map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-app-surface p-4">
            <p className="font-sans text-2xl font-bold leading-none text-foreground">
              {nf.format(stat.value)}
            </p>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      {user && earned.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-sans text-base font-bold text-foreground">Badges earned</h2>
            <Link to="/badges" className="text-sm font-semibold text-app-coral">
              See all
            </Link>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {earned.map((badge) => (
              <div key={badge.id} className="w-[5.5rem] shrink-0 text-center">
                <div className="flex h-16 w-full items-center justify-center rounded-2xl bg-app-gold-tint font-sans text-xl font-bold text-app-gold">
                  {badge.name.slice(0, 1).toUpperCase()}
                </div>
                <p className="mt-2 text-[11px] font-medium leading-tight text-foreground">
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {user && (receivedActs?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 font-sans text-base font-bold text-foreground">Passed to you</h2>
          <ul className="overflow-hidden rounded-2xl bg-app-surface">
            {(receivedActs ?? []).map((act, i) => {
              const thanked = thankedActs?.has(act.id) || justThanked.has(act.id);
              return (
                <li
                  key={act.id}
                  className={cn("p-4", i > 0 && "border-t border-border")}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-teal-tint text-lg">
                      {actEmoji(act.tags, act.mode)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                        {act.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        From {act.fromName} · {timeAgo(act.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pl-[3.25rem]">
                    {thanked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-app-gold-tint px-3 py-1.5 text-xs font-semibold text-app-gold">
                        🙏 Thanks sent!
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendThanks(act.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-app-coral px-3 py-1.5 text-xs font-semibold text-app-surface"
                      >
                        <HeartHandshake className="h-3.5 w-3.5" />
                        Send thanks
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-sans text-base font-bold text-foreground">
          {user ? "Your recent kindness" : "Recent kindness"}
        </h2>
        {user && (myActs?.length ?? 0) > 0 ? (
          <ul className="overflow-hidden rounded-2xl bg-app-surface">
            {(myActs ?? []).map((act, i) => (
              <li
                key={act.id}
                className={cn("p-4", i > 0 && "border-t border-border")}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-coral-tint text-lg">
                    {actEmoji(act.tags, act.mode)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {act.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(act.createdAt)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      act.mode === "did"
                        ? "bg-app-coral-tint text-app-coral"
                        : "bg-app-teal-tint text-app-teal",
                    )}
                  >
                    {modeLabel(act.mode)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 pl-[3.25rem]">
                  <ReactionButton
                    count={reactions[act.id]?.count ?? 0}
                    reacted={reactions[act.id]?.reacted ?? false}
                    onToggle={() => void toggle(act.id)}
                  />
                  {thankedActs?.has(act.id) && (
                    <span className="inline-flex items-center rounded-full bg-app-gold-tint px-2.5 py-1 text-[11px] font-semibold text-app-gold">
                      🙏 Thanked
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl bg-app-surface p-5 text-sm leading-relaxed text-muted-foreground">
            {user
              ? "Nothing logged yet. Your first act of kindness shows up here."
              : "Browse the wall to see what people are passing forward right now."}
            <div className="mt-3">
              <Link to={user ? "/log" : "/wall"} className="font-semibold text-app-coral">
                {user ? "Log an act →" : "Open the wall →"}
              </Link>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Link
          to={user ? "/log" : "/join"}
          className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface"
        >
          {user ? "Log an act of kindness" : "Commit to acts of kindness"}
        </Link>
        <Link
          to="/badges"
          aria-label="See all badges"
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-app-surface"
        >
          <LayoutGrid className="h-5 w-5 text-foreground" />
        </Link>
      </div>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Part of the movement at{" "}
        <a href="https://pasalopalante.com" className="underline">
          pasalopalante.com
        </a>
      </p>
    </div>
  );
}
