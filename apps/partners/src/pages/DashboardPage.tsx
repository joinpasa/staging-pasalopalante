import { useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Compass, Heart, Image as ImageIcon, Layers, MapPin, MessageSquareWarning, Pencil } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import StatusPill from "@/components/StatusPill";
import LogOneDialog from "@/components/LogOneDialog";
import ActMenu from "@/components/ActMenu";
import DashboardTour, { type TourStep } from "@/components/DashboardTour";
import { hasSeenTour, markTourSeen, TOUR_EVENT } from "@/lib/tour";
import { useCopy } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { seasonCountdown } from "@/lib/season";
import { actsLogged, usePartnerSummary, useSubmissions, type Submission } from "@/lib/submissions";

const THUMB_TINTS = [
  "bg-[#FFF1E8] text-orange",
  "bg-sky-soft text-sky",
  "bg-rose-soft text-rose",
  "bg-sun-soft text-[#B07D00]",
];

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Thumb({ row, index }: { row: Submission; index: number }) {
  if (row.thumbUrl) {
    return <img src={row.thumbUrl} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-cover" />;
  }
  return (
    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] ${THUMB_TINTS[index % THUMB_TINTS.length]}`}>
      <ImageIcon className="h-[22px] w-[22px]" aria-hidden="true" />
    </div>
  );
}

function ProgressCard({ logged, goal }: { logged: number; goal: number }) {
  const { t, locale } = useCopy();
  const now = useNow();
  const cd = seasonCountdown(now);
  const pct = goal > 0 ? Math.min(100, Math.round((logged / goal) * 100)) : 0;
  const fmt = (n: number) => n.toLocaleString(locale);

  const status =
    logged === 0
      ? t.firstActBar
      : pct >= 100
        ? t.goalReached
        : pct >= 50
          ? t.halfway
          : t.keepGoing;

  return (
    <section data-tour="progress" className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-card col-span-2 lg:col-span-1 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold tracking-[0.08em] text-ink-muted">{t.actsLogged}</span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-5xl font-extrabold leading-none">{fmt(logged)}</span>
            {goal > 0 && <span className="text-lg font-semibold text-ink-muted">{t.pledged(fmt(goal))}</span>}
          </div>
        </div>
        {cd.phase === "after" ? (
          <span className="rounded-full bg-sky-soft px-3 py-1.5 text-xs font-bold text-sky-ink">{t.seasonOver}</span>
        ) : (
          <div className="flex flex-col items-start gap-1.5">
            <span className="text-[10px] font-bold tracking-[0.08em] text-ink-muted">
              {cd.phase === "before" ? t.startsIn : t.endsIn}
            </span>
            <div className="flex gap-1.5">
              {[
                [cd.days, t.days],
                [cd.hours, t.hrs],
                [cd.minutes, t.min],
              ].map(([n, label]) => (
                <div key={label as string} className="flex w-[58px] flex-col items-center rounded-xl bg-canvas py-2">
                  <span className="text-xl font-extrabold">{String(n).padStart(2, "0")}</span>
                  <span className="text-[10px] font-semibold text-ink-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        <div
          className="relative h-3.5 rounded-full bg-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t.actsLogged}
        >
          {pct > 0 && <div className="h-3.5 rounded-full bg-sky" style={{ width: `${pct}%` }} />}
          {goal > 0 && (
            <div
              className={`absolute start-1/2 top-[-3px] -ms-2.5 h-5 w-5 rounded-full border-[3px] border-white ${pct >= 50 ? "bg-sun" : "bg-line"}`}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-[13px] font-semibold text-ink-muted">
          <span>
            {logged > 0 && goal > 0 && <b className="text-navy">{pct}% · </b>}
            {status}
          </span>
          <span>
            {goal > logged && logged > 0 && `${t.toGo(fmt(goal - logged))} · `}
            {t.seasonEnds}
          </span>
        </div>
      </div>
    </section>
  );
}

/** A "Needs Changes" row is a link to its edit screen; every other row is plain. */
/**
 * One act row. A "Needs Changes" row opens its edit screen when tapped (the
 * "Edit & resubmit" link inside is the keyboard/screen-reader route); taps on
 * the ⋯ menu are left alone.
 */
function RowWrap({ editTo, className, children }: { editTo: string | null; className: string; children: ReactNode }) {
  const navigate = useNavigate();
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!editTo || (e.target as HTMLElement).closest("[data-row-ignore], a, button")) return;
    navigate(editTo);
  };
  return (
    <div onClick={onClick} className={`${className} ${editTo ? "cursor-pointer" : ""}`}>
      {children}
    </div>
  );
}

function RecentActs({ rows }: { rows: Submission[] }) {
  const { t, locale } = useCopy();
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 5);
  const fmtDate = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });

  return (
    <section className="flex flex-col gap-3.5" data-tour="recent">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[22px] font-extrabold">{t.recentActs}</h2>
        {rows.length > 5 && (
          <button type="button" onClick={() => setAll((a) => !a)} className="text-sm font-bold text-sky-deep hover:text-navy">
            {all ? t.showLess : t.seeAll}
          </button>
        )}
      </div>
      <div className="rounded-3xl bg-white px-4 py-2 shadow-[0_4px_20px_rgba(14,35,75,0.06)] lg:px-7">
        <div className="hidden grid-cols-[1fr_100px_130px_170px_40px] gap-4 py-3.5 text-xs font-bold tracking-[0.06em] text-ink-muted md:grid">
          <span>{t.colActivity}</span>
          <span>{t.colActs}</span>
          <span>{t.colDate}</span>
          <span>{t.colStatus}</span>
          <span />
        </div>
        {shown.map((r, i) => {
          // "Needs Changes" rows open the act for editing; others aren't clickable.
          const editable = r.status === "changes_requested";
          return (
          <RowWrap
            key={r.id}
            editTo={editable ? `/edit/${r.id}` : null}
            className={`group relative flex flex-col gap-2 border-t border-line-faint py-3 pe-11 text-navy first:border-t-0 md:grid md:grid-cols-[1fr_100px_130px_170px_40px] md:items-center md:gap-4 md:pe-0 md:first:border-t ${
              editable ? "-mx-2 rounded-2xl px-2 hover:bg-rose-soft/40" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-4">
              <Thumb row={r} index={i} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[15px] font-semibold [overflow-wrap:anywhere]">{r.description}</span>
                {editable && r.review_note && (
                  <span className="flex flex-col gap-0.5 rounded-xl bg-rose-soft px-3 py-2 text-[13px]">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-rose-ink">{t.reviewerNote}</span>
                    <span className="font-medium text-navy">{r.review_note}</span>
                  </span>
                )}
                <span className="text-[13px] text-ink-muted md:hidden">
                  {r.people_count.toLocaleString(locale)} {t.colActs.toLowerCase()} · {fmtDate(r.act_date)}
                </span>
              </div>
            </div>
            <span className="hidden text-[15px] font-bold md:block">{r.people_count.toLocaleString(locale)}</span>
            <span className="hidden text-sm text-ink-muted md:block">{fmtDate(r.act_date)}</span>
            <span className="flex flex-col items-start gap-2 ps-[72px] md:ps-0">
              <StatusPill status={r.status} />
              {editable && (
                <Link to={`/edit/${r.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-sky-deep no-underline">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.editAct}
                </Link>
              )}
            </span>
            <div data-row-ignore className="absolute end-0 top-2 md:static">
              <ActMenu act={r} tourTarget={i === 0} />
            </div>
          </RowWrap>
          );
        })}
      </div>
    </section>
  );
}

function EmptyState() {
  const { t } = useCopy();
  return (
    <section className="flex flex-col gap-3.5" data-tour="recent">
      <h2 className="m-0 text-[22px] font-extrabold">{t.recentActs}</h2>
      <div className="flex flex-col items-center gap-6 rounded-3xl border-2 border-dashed border-[#F3D9A4] bg-white p-8 text-center lg:flex-row lg:gap-10 lg:p-12 lg:text-start">
        <div className="flex h-[140px] w-[140px] shrink-0 items-center justify-center rounded-full bg-sun-soft">
          <img src="/kf-heart.webp" alt="" className="w-[84px]" />
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          <h3 className="m-0 text-[26px] font-extrabold">{t.emptyTitle}</h3>
          <p className="m-0 max-w-[560px] text-base leading-relaxed text-ink-muted">{t.emptyBody}</p>
        </div>
        <Link to="/log" className="btn-primary shrink-0 no-underline">
          {t.logFirst}
        </Link>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { t } = useCopy();
  const { partner, staff } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: rows, isLoading, isError } = useSubmissions();
  const { data: summary } = usePartnerSummary();
  const logOpen = location.pathname === "/log";
  const editId = location.pathname.startsWith("/edit/") ? location.pathname.slice("/edit/".length) : null;
  const editing = editId ? rows?.find((r) => r.id === editId && r.status === "changes_requested") : undefined;
  const needsChanges = (rows ?? []).filter((r) => r.status === "changes_requested");

  // ── Tour: once automatically for each newcomer, then from "Take a tour" ──
  const [touring, setTouring] = useState(false);
  const startTour = useCallback(() => setTouring(true), []);
  const endTour = useCallback(() => {
    setTouring(false);
    if (staff) markTourSeen(staff.id);
  }, [staff]);
  useEffect(() => {
    window.addEventListener(TOUR_EVENT, startTour);
    return () => window.removeEventListener(TOUR_EVENT, startTour);
  }, [startTour]);
  useEffect(() => {
    // Wait until the page has its content, and never on top of an open form.
    if (!staff || isLoading || logOpen || editId) return;
    const requested = (location.state as { tour?: boolean } | null)?.tour;
    if (requested || !hasSeenTour(staff.id)) {
      if (requested) navigate(".", { replace: true, state: null });
      const id = window.setTimeout(startTour, 400);
      return () => window.clearTimeout(id);
    }
  }, [staff, isLoading, logOpen, editId, location.state, navigate, startTour]);
  const tourSteps: TourStep[] = [
    { title: t.tour.welcomeTitle, body: t.tour.welcomeBody },
    { target: "org", title: t.tour.orgTitle, body: t.tour.orgBody },
    { target: "progress", title: t.tour.progressTitle, body: t.tour.progressBody },
    { target: "log-one", title: t.tour.logOneTitle, body: t.tour.logOneBody },
    { target: "bulk", title: t.tour.bulkTitle, body: t.tour.bulkBody },
    { target: "recent", title: t.tour.recentTitle, body: t.tour.recentBody },
    { target: "act-menu", title: t.tour.actMenuTitle, body: t.tour.actMenuBody },
    { target: "invite", title: t.tour.inviteTitle, body: t.tour.inviteBody },
    { target: "menu", title: t.tour.menuTitle, body: t.tour.menuBody },
    { title: t.tour.doneTitle, body: t.tour.doneBody },
  ];

  // An /edit/ link for an act that isn't (or is no longer) "Needs Changes" — back to the dashboard.
  useEffect(() => {
    if (editId && rows && !editing) navigate("/", { replace: true });
  }, [editId, rows, editing, navigate]);
  const firstName = staff?.name.split(/\s+/)[0] ?? "";

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <PortalHeader />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-4 py-6 lg:px-10 lg:py-10 xl:px-40">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 text-[28px] font-extrabold lg:text-4xl">{t.hi(firstName)} 👋</h1>
            <div data-tour="org" className="flex items-center gap-1.5 text-base font-medium text-ink-muted">
              <MapPin className="h-[18px] w-[18px] text-sky" aria-hidden="true" />
              <span>{[partner?.name, partner?.city].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={startTour}
            className="inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-sun bg-sun-soft px-4 text-sm font-bold text-sun-ink hover:bg-sun/30"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            {t.takeTour}
          </button>
        </div>

        {needsChanges.length > 0 && (
          <Link
            to={`/edit/${needsChanges[0].id}`}
            className="flex items-center gap-4 rounded-2xl border-[1.5px] border-rose/30 bg-rose-soft px-5 py-4 text-navy no-underline hover:border-rose/60"
          >
            <MessageSquareWarning className="h-6 w-6 shrink-0 text-rose" aria-hidden="true" />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-base font-extrabold">{t.needsChangesBanner(needsChanges.length)}</span>
              <span className="text-sm font-medium text-ink-muted">{t.needsChangesBannerSub}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-rose rtl:rotate-180" aria-hidden="true" />
          </Link>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[2fr_1fr_1fr] lg:gap-5">
          <ProgressCard logged={actsLogged(rows)} goal={summary?.pledge_goal ?? 0} />
          <Link
            to="/log"
            data-tour="log-one"
            className="flex min-h-[150px] flex-col justify-between gap-4 rounded-3xl bg-orange p-5 text-white no-underline shadow-cta lg:p-6"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-white/20">
              <Heart className="h-[26px] w-[26px]" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-xl font-extrabold lg:text-[22px]">{t.logOne}</span>
              <span className="text-sm font-medium">{t.logOneSub}</span>
            </span>
          </Link>
          <Link
            to="/bulk"
            data-tour="bulk"
            className="flex min-h-[150px] flex-col justify-between gap-4 rounded-3xl border-[1.5px] border-line-soft bg-white p-5 text-navy no-underline lg:p-6"
          >
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-sky-soft">
              <Layers className="h-[26px] w-[26px] text-sky" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-xl font-extrabold lg:text-[22px]">{t.bulkLog}</span>
              <span className="text-sm font-medium text-ink-muted">{t.bulkSub}</span>
            </span>
          </Link>
        </div>

        {isError ? (
          <p role="alert" className="m-0 rounded-2xl bg-rose-soft p-5 font-semibold text-rose-ink">
            {t.loadError}
          </p>
        ) : isLoading ? (
          <div className="h-48 animate-pulse rounded-3xl bg-white/70" />
        ) : rows && rows.length > 0 ? (
          <RecentActs rows={rows} />
        ) : (
          <EmptyState />
        )}
      </main>
      <LogOneDialog open={logOpen || !!editing} editing={editing} onClose={() => navigate("/")} />
      {touring && <DashboardTour steps={tourSteps} onClose={endTour} />}
    </div>
  );
}
