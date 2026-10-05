import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Flame,
  Heart,
  HeartHandshake,
  LayoutGrid,
  QrCode,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import AccountMenu from "@/components/app/AccountMenu";
import JoinGate from "@/components/app/JoinGate";
import ReactionButton from "@/components/app/ReactionButton";
import MyCommitment from "@/components/app/MyCommitment";
import SeasonCountdown from "@/components/app/SeasonCountdown";
import FirstTimeTour from "@/components/app/FirstTimeTour";
import OnboardingWalkthrough, { type OnboardingResult } from "@/components/app/OnboardingWalkthrough";
import { useAuth } from "@shared/contexts/AuthContext";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";
import {
  useActReactions,
  useActsReceivedByMe,
  useAppBadges,
  useAppMe,
  useMovementTotals,
  useMyRecentActs,
  useSendThanks,
  useThanksForActs,
  useWallActs,
} from "@/hooks/useAppData";
import { actEmoji, modeLabel, timeAgo } from "@shared/lib/appActs";
import { submitPPLForm } from "@shared/lib/pplForm";
import { cn } from "@shared/lib/utils";

const GOAL = 1_000_000_000;

function timeOfDayGreeting(labels: { morning: string; afternoon: string; evening: string }) {
  const h = new Date().getHours();
  if (h < 12) return labels.morning;
  if (h < 18) return labels.afternoon;
  return labels.evening;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppHome() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const nf = new Intl.NumberFormat(lang);
  const { data: me } = useAppMe();
  const { data: totals } = useMovementTotals();
  const { data: myActs } = useMyRecentActs();
  const { data: badges } = useAppBadges();
  const { data: receivedActs } = useActsReceivedByMe();
  const { data: wallActs } = useWallActs(3);
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
  const queryClient = useQueryClient();

  // A brand-new, verified account that hasn't pledged yet and hasn't seen
  // the tour - reachable regardless of which platform/device the signup
  // request vs. the link click happened on, since both flags live on the
  // account (profiles.onboarding_seen, commitments), not local storage.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  useEffect(() => {
    if (me && !me.onboardingSeen && !me.hasCommitment) setShowOnboarding(true);
  }, [me]);

  // First-Time Tour: a second, lighter coach-mark layer for in-app
  // navigation (account menu, Share QR, quick-log) — separate from the
  // Welcome carousel above and never shown at the same time as it, since
  // onboardingSeen only flips true once that carousel is done. Server-side
  // flag for the same reason onboardingSeen is: reachable from any device,
  // not just the one the tour first played on.
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [tourDontShow, setTourDontShow] = useState(true);
  useEffect(() => {
    if (me && me.onboardingSeen && !me.tourSeen) setTourStep(0);
  }, [me]);

  async function exitTour() {
    setTourStep(null);
    if (!user || me?.tourSeen) return;
    const { error } = await supabase.from("profiles").update({ tour_seen: true }).eq("user_id", user.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["app", "me"] });
  }

  async function finishOnboarding({ pledgeCount, firstName, lastName, country }: OnboardingResult) {
    if (!user) return;
    setOnboardingBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-commitment", {
        body: {
          type: "individual",
          first_name: firstName,
          last_name: lastName,
          email: user.email,
          pledge_count: pledgeCount,
          country,
          help_role: "do_acts",
        },
      });
      const failure = (data as { error?: string } | null)?.error ?? error?.message;
      if (failure) toast.error(failure);
      // PPL Integration — sync to Airtable + GHL (tags get-involved-lead /
      // get-involved-individual). Was missing entirely for this onboarding
      // pledge, unlike AppJoin's pre-verification pledge which already syncs.
      try {
        await submitPPLForm("pledge", {
          fullName: `${firstName} ${lastName}`.trim(),
          email: user.email || "",
          country: country || undefined,
          pledgeCount,
          message: "Role: do_acts",
          mode: "individual",
          helpRole: "do_acts",
          pledgeContext: "onboarding",
        });
      } catch {
        // Non-fatal — commitment already succeeded
      }
    } catch {
      toast.error(t.appHome.savingPledgeError);
    } finally {
      await supabase.from("profiles").update({ onboarding_seen: true }).eq("user_id", user.id);
      setOnboardingBusy(false);
      setShowOnboarding(false);
      queryClient.invalidateQueries({ queryKey: ["app", "me"] });
    }
  }

  // Someone scanned a pass QR (app.pasalopalante.com?ref=<code>) — including
  // via the phone's own camera app, which opens the installed PWA straight
  // to Home rather than going through the in-app scanner. /wave already
  // handles both cases correctly (logs the hand-off if signed in, forwards
  // to /join with the code preserved if not), so just hand it off there
  // instead of duplicating (and previously getting wrong) that branching
  // here — a standalone visit used to silently drop the code and do nothing.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    navigate(`/wave?ref=${encodeURIComponent(ref)}`, { replace: true });
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

  // The quick-log field on the hero card — a minimal direct call to the same
  // submit-act function ShareActFlow uses, for the case where someone just
  // wants to log something in one tap without leaving the dashboard. The
  // full flow (mode picker, multi-photo, anonymous name/email) stays at
  // /log for anyone who wants more than that.
  const [quickText, setQuickText] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickLogged, setQuickLogged] = useState(false);
  const [quickLoggedTotal, setQuickLoggedTotal] = useState<number | null>(null);

  async function submitQuick() {
    if (!user || quickSubmitting) return;
    const description = quickText.trim() || t.appHome.quickLogDefault;
    setQuickSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-act", {
        body: { mode: "performed", description, photo_paths: [] },
      });
      const failure = (data as { error?: string } | null)?.error ?? error?.message;
      if (failure) {
        toast.error(failure);
        return;
      }
      if (data?.status === "rejected") {
        toast.error(data?.short_reason || t.appHome.unableToLogAct);
        return;
      }
      if (!data?.id) {
        toast.error(t.appHome.genericError);
        return;
      }
      setQuickLogged(true);
      setQuickLoggedTotal((me?.actsPassedForward ?? 0) + 1);
      queryClient.invalidateQueries({ queryKey: ["app", "me"] });
      queryClient.invalidateQueries({ queryKey: ["app", "my-acts"] });
    } catch {
      toast.error(t.appHome.genericError);
    } finally {
      setQuickSubmitting(false);
    }
  }

  function resetQuick() {
    setQuickLogged(false);
    setQuickText("");
  }

  const earned = (badges ?? []).filter((b) => b.earned).slice(0, 6);
  const badgeName = (badge: NonNullable<typeof badges>[number]) =>
    (lang === "de" ? badge.name_de : lang === "es" ? badge.name_es : lang === "fr" ? badge.name_fr : null)
      || badge.name;
  const actsAllTime = totals?.actsAllTime ?? 0;
  const progress = Math.min((actsAllTime / GOAL) * 100, 100);
  const greetingName = me?.firstName ?? t.appWidgets.friend;

  if (showOnboarding) {
    return (
      <OnboardingWalkthrough
        firstName={me?.firstName}
        lastName={me?.lastName}
        country={me?.place !== "Worldwide" ? me?.place : ""}
        onFinish={finishOnboarding}
        busy={onboardingBusy}
      />
    );
  }

  return (
    <>
    <div className="space-y-5 px-5 pt-5">
      <header className="flex items-center justify-between">
        <img
          src="/logo-PKF-horizontal-color.png"
          srcSet="/logo-PKF-horizontal-color.png 1x, /logo-PKF-horizontal-color@2x.png 2x"
          alt={t.appHome.movementName}
          className="h-7 w-auto shrink-0 object-contain"
        />
        <div className="flex items-center gap-2.5">
          {user && (
            <Link
              to="/pass"
              aria-label={t.appHome.shareQrAria}
              className={cn(
                "relative flex h-9 items-center gap-1.5 rounded-full bg-app-sky/10 px-3.5",
                tourStep === 1 && "z-50 ring-4 ring-app-coral/40",
              )}
            >
              <QrCode className="h-[15px] w-[15px] text-app-sky" strokeWidth={1.9} />
              <span className="text-xs font-bold text-app-sky">{t.appHome.shareQr}</span>
            </Link>
          )}
          <AccountMenu highlighted={tourStep === 0} />
        </div>
      </header>

      <div className="flex items-start justify-between gap-2.5">
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {timeOfDayGreeting(t.appHome)}
          </p>
          {user && (
            <p className="mt-0.5 truncate text-[21px] font-bold leading-tight text-foreground">
              {greetingName}
            </p>
          )}
          <p className="text-[11.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {t.appHome.greetingSubtitle}
          </p>
        </div>
        {user && me?.tourSeen && (
          <button
            type="button"
            onClick={() => setTourStep(0)}
            className="mt-1 shrink-0 text-[11.5px] font-bold text-app-sky underline underline-offset-2"
          >
            {t.appHome.takeTour}
          </button>
        )}
      </div>

      {!user && <JoinGate />}

      {user ? (
        <section
          className={cn(
            "relative overflow-hidden rounded-[20px] bg-app-coral p-4 text-app-surface shadow-[0_12px_26px_rgba(243,112,35,0.35)]",
            tourStep === 2 && "z-50 outline outline-4 outline-app-coral/50 outline-offset-4",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-app-surface/20">
              <HeartHandshake className="h-[18px] w-[18px]" />
            </div>
            <p className="text-[15.5px] font-bold">{t.appHome.logActHeading}</p>
          </div>

          {!quickLogged ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 rounded-full bg-app-surface py-[5px] pl-4 pr-[5px]">
                <input
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder={t.appHome.quickLogDefault}
                  aria-label={t.appHome.describeAct}
                  className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-app-ink outline-none"
                />
                <button
                  type="button"
                  onClick={submitQuick}
                  disabled={quickSubmitting}
                  aria-label={t.appHome.logThisAct}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-app-ink disabled:opacity-60"
                >
                  <Check className="h-4 w-4 text-app-surface" />
                </button>
              </div>
              <Link
                to="/log"
                className="mt-2.5 block text-[11.5px] font-semibold text-app-surface/90 underline underline-offset-2"
              >
                {t.appHome.addPhotoOrPickAct}
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2.5 rounded-2xl bg-app-surface/20 px-3.5 py-2.5">
              <CheckCircle2 className="h-5 w-5 shrink-0 fill-app-surface text-app-coral" />
              <p className="flex-1 text-[12.5px] leading-snug">
                {t.appHome.quickLogged.replace("{count}", nf.format(quickLoggedTotal ?? 0))}
              </p>
              <button
                type="button"
                onClick={resetQuick}
                className="shrink-0 text-[11.5px] font-bold underline underline-offset-2"
              >
                {t.appHome.logAnother}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl border-4 border-warm-terracotta bg-app-coral p-6 text-app-surface">
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-app-surface/10" />
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-app-surface/80">
            {t.appHome.movementName}
          </p>
          <div className="relative mt-1 flex items-end gap-3">
            <span className="font-sans text-6xl font-extrabold leading-none tracking-tight">
              {nf.format(actsAllTime)}
            </span>
            <span className="max-w-[7rem] pb-1 text-sm font-semibold leading-snug">
              {t.appHome.actsPassedForward}
            </span>
          </div>
          <div className="relative mt-5 border-t border-app-surface/25 pt-3">
            <div className="flex items-baseline justify-between text-sm font-medium">
              <span>{t.appHome.towardGoal}</span>
              <span className="font-semibold">{nf.format(totals?.actsToday ?? 0)} {t.appHome.today}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-app-surface/25">
              <div
                className="h-full rounded-full bg-app-surface"
                style={{ width: `${Math.max(progress, 1.5)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {user ? (
        <section className="grid grid-cols-3 gap-[9px]">
          <div className="flex flex-col gap-1.5 rounded-2xl bg-app-sky/10 p-3">
            <Heart className="h-[17px] w-[17px] text-app-sky" strokeWidth={1.7} />
            <p className="text-[19px] font-extrabold leading-none text-foreground">
              {nf.format(me?.actsPassedForward ?? 0)}
            </p>
            <p className="text-[10.5px] leading-tight text-muted-foreground">{t.appHome.actsPassed}</p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-2xl bg-app-gold/15 p-3">
            <Flame className="h-[17px] w-[17px] text-app-gold" strokeWidth={1.6} />
            <p className="text-[19px] font-extrabold leading-none text-foreground">
              {nf.format(me?.dayStreak ?? 0)}
            </p>
            <p className="text-[10.5px] leading-tight text-muted-foreground">{t.appHome.dayStreak}</p>
          </div>
          <Link
            to="/connections"
            aria-label={t.appWidgets.myNetwork}
            className="relative flex flex-col gap-1.5 rounded-2xl bg-app-magenta/10 p-3"
          >
            <span className="absolute right-2 top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-app-magenta/15">
              <ArrowUpRight className="h-[11px] w-[11px] text-app-magenta" strokeWidth={2.1} />
            </span>
            <Users className="h-[17px] w-[17px] text-app-magenta" strokeWidth={1.6} />
            <p className="text-[19px] font-extrabold leading-none text-foreground">
              {nf.format(me?.connections ?? 0)}
            </p>
            <p className="text-[10.5px] leading-tight text-muted-foreground">{t.appHome.peopleReached}</p>
          </Link>
        </section>
      ) : (
        <section className="grid grid-cols-3 gap-3">
          {[
            { value: totals?.pledged ?? 0, label: t.appCommon.actsPledged },
            { value: totals?.actsToday ?? 0, label: t.appCommon.loggedToday },
            { value: actsAllTime, label: t.appCommon.actsAllTime },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-app-surface p-4">
              <p className="font-sans text-2xl font-bold leading-none text-foreground">
                {nf.format(stat.value)}
              </p>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>
      )}

      {user && <MyCommitment userId={user.id} email={user.email ?? ""} />}

      <SeasonCountdown />

      {user && earned.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-sans text-base font-bold text-foreground">{t.appHome.badgesEarned}</h2>
            <Link to="/badges" className="text-sm font-semibold text-app-coral">
              {t.appHome.seeAll}
            </Link>
          </div>
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {earned.map((badge) => (
              <div key={badge.id} className="w-[5.5rem] shrink-0 text-center">
                <div className="flex h-16 w-full items-center justify-center rounded-2xl bg-app-gold-tint text-2xl">
                  {badge.icon || "🏅"}
                </div>
                <p className="mt-2 text-[11px] font-medium leading-tight text-foreground">
                  {badgeName(badge)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {user && (receivedActs?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 font-sans text-base font-bold text-foreground">{t.appHome.passedToYou}</h2>
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
                        {t.appHome.from} {act.fromName} · {timeAgo(act.createdAt, t.appCommon, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pl-[3.25rem]">
                    {thanked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-app-gold-tint px-3 py-1.5 text-xs font-semibold text-app-gold">
                        🙏 {t.appHome.thanksSent}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendThanks(act.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-app-coral px-3 py-1.5 text-xs font-semibold text-app-surface"
                      >
                        <HeartHandshake className="h-3.5 w-3.5" />
                        {t.appHome.sendThanks}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {user && (myActs?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 font-sans text-base font-bold text-foreground">{t.appHome.yourRecentKindness}</h2>
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
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(act.createdAt, t.appCommon, lang)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      act.mode === "performed"
                        ? "bg-app-coral-tint text-app-coral"
                        : "bg-app-teal-tint text-app-teal",
                    )}
                  >
                    {modeLabel(act.mode, t.appCommon)}
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
                      🙏 {t.appHome.thanked}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(wallActs?.length ?? 0) > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-[15px] font-bold text-foreground">{t.appHome.recentActs}</h2>
            <Link to="/wall" className="text-xs font-bold text-app-sky">
              {t.appHome.seeAll}
            </Link>
          </div>
          {(wallActs ?? []).slice(0, 2).map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-2.5 rounded-2xl border border-border bg-app-surface p-3.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-sky/15 text-[13px] font-bold text-app-sky">
                {initials(act.name) || "PP"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-foreground">{act.name}</p>
                  <p className="shrink-0 text-[10.5px] text-muted-foreground">{timeAgo(act.createdAt, t.appCommon, lang)}</p>
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-foreground/75">
                  {act.description}
                </p>
                <span className="mt-2 inline-block rounded-full bg-app-sky/10 px-2.5 py-1 text-[10.5px] font-semibold text-app-sky">
                  {modeLabel(act.mode, t.appCommon)}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2.5 rounded-[20px] border border-app-sky/20 bg-app-sky/[0.08] p-[18px]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-sky/15">
            <Users className="h-[18px] w-[18px] text-app-sky" strokeWidth={1.7} />
          </span>
          <p className="text-[15px] font-bold text-foreground">{t.appHome.wantToDoMore}</p>
        </div>
        <p className="text-[12.5px] leading-relaxed text-foreground/70">
          {t.appHome.volunteerOrPartner}
        </p>
        <a
          href="https://pasalopalante.com/get-involved"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 self-start rounded-xl bg-app-sky px-5 py-2.5 text-[13.5px] font-bold text-app-surface"
        >
          {t.appHome.getInvolved}
        </a>
      </section>

      {!user && (
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface"
          >
            {t.appHome.commitToActs}
          </Link>
          <Link
            to="/badges"
            aria-label={t.appHome.seeAllBadges}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-app-surface"
          >
            <LayoutGrid className="h-5 w-5 text-foreground" />
          </Link>
        </div>
      )}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {t.appHome.movementFooter}{" "}
        <a href="https://passkindnessforward.com" className="underline">
          passkindnessforward.com
        </a>
      </p>
    </div>

    {user && tourStep !== null && (
      <FirstTimeTour
        step={tourStep}
        dontShow={tourDontShow}
        onToggleDontShow={() => setTourDontShow((v) => !v)}
        onNext={() => setTourStep((s) => Math.min((s ?? 0) + 1, 2))}
        onExit={exitTour}
      />
    )}
    </>
  );
}
