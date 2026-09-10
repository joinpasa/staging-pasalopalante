import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";

interface Commitment {
  id: string;
  pledge_count: number;
  type: string;
  created_at: string;
}

const PRESETS = [1, 5, 10, 25, 100];

// Puerto Rico is AST (UTC−4) year-round, no DST.
const SEASON_START = new Date("2026-11-01T00:00:00-04:00");

function getSeasonTimeLeft() {
  const diff = SEASON_START.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const inputClass =
  "w-28 rounded-xl border border-border bg-app-canvas px-3 py-2 text-sm text-foreground outline-none focus:border-app-coral";
const primaryBtn =
  "rounded-full bg-app-coral px-4 py-2 text-sm font-semibold text-app-surface disabled:opacity-60";
const ghostBtn = "rounded-full border border-border bg-app-canvas px-4 py-2 text-sm font-semibold text-foreground";

/**
 * App-dashboard equivalent of the website's account-page YourCommitment
 * card — same data (the "commitments" table, the same submit-commitment
 * function used by onboarding) and the same countdown/progress/modify
 * behavior, just styled to match the rest of the app instead of the
 * website's shadcn components. Was previously website-only, which made
 * the pledge someone made in onboarding invisible again once they left
 * that one-time screen.
 */
export default function MyCommitment({ userId, email }: { userId: string; email: string }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Commitment[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [actsCount, setActsCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newCount, setNewCount] = useState(10);
  const [newCountText, setNewCountText] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(getSeasonTimeLeft);
  const seasonStarted = Date.now() >= SEASON_START.getTime();

  useEffect(() => {
    if (seasonStarted) return;
    const id = setInterval(() => setTimeLeft(getSeasonTimeLeft()), 1000);
    return () => clearInterval(id);
  }, [seasonStarted]);

  const load = async () => {
    const { data } = await supabase
      .from("commitments")
      .select("id, pledge_count, type, created_at")
      .eq("type", "individual")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setItems((data as Commitment[]) || []);

    const { count } = await supabase
      .from("acts_of_kindness")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "published");
    setActsCount(count || 0);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, email]);

  const save = async (id: string) => {
    if (draft < 1) return;
    const { error } = await supabase.from("commitments").update({ pledge_count: draft }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.account.saved);
    setEditing(null);
    load();
  };

  const submitNew = async () => {
    if (newCount < 1 || !email) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-commitment", {
        body: { type: "individual", email, pledge_count: newCount },
      });
      const failure = (data as { error?: string } | null)?.error ?? error?.message;
      if (failure) {
        toast.error(failure);
        return;
      }
      toast.success(t.account.saved);
      setCreating(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const active = items?.[0];
  const progress = active ? Math.min(100, Math.round((actsCount / active.pledge_count) * 100)) : 0;

  if (items === null) {
    return <div className="h-32 animate-pulse rounded-2xl bg-app-surface" aria-busy="true" />;
  }

  return (
    <section className="rounded-2xl bg-app-surface p-4">
      <h2 className="font-sans text-base font-bold text-foreground">{t.account.commitmentHeading}</h2>

      {!active ? (
        creating ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              {t.account.personalCommitmentIntro.replace("{month}", t.account.eventMonth)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setNewCount(n);
                    setNewCountText(String(n));
                  }}
                  className={
                    newCount === n
                      ? "rounded-full border border-app-coral bg-app-coral px-3 py-1.5 text-sm font-semibold text-app-surface"
                      : "rounded-full border border-border bg-app-canvas px-3 py-1.5 text-sm font-medium text-foreground"
                  }
                >
                  {n}
                </button>
              ))}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={1_000_000_000}
                value={newCountText}
                onChange={(e) => {
                  const raw = e.target.value;
                  setNewCountText(raw);
                  const parsed = parseInt(raw, 10);
                  if (Number.isFinite(parsed)) setNewCount(Math.min(1_000_000_000, Math.max(1, parsed)));
                }}
                onBlur={() => {
                  const parsed = parseInt(newCountText, 10);
                  const next = Number.isFinite(parsed) ? Math.min(1_000_000_000, Math.max(1, parsed)) : 1;
                  setNewCount(next);
                  setNewCountText(String(next));
                }}
                className={inputClass}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t.account.personalCommitmentNote}</p>
            <div className="flex gap-2">
              <button type="button" onClick={submitNew} disabled={submitting} className={primaryBtn}>
                {t.account.submitPersonalCommitment}
              </button>
              <button type="button" onClick={() => setCreating(false)} className={ghostBtn}>
                {t.account.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-center">
            <p className="mb-3 text-sm text-muted-foreground">{t.account.emptyCommitment}</p>
            <button type="button" onClick={() => setCreating(true)} className={primaryBtn}>
              {t.account.makePersonalCommitment}
            </button>
          </div>
        )
      ) : (
        <div className="mt-3">
          <p className="text-sm text-muted-foreground">
            {t.account.commitmentBody
              .replace("{count}", String(active.pledge_count))
              .replace("{month}", t.account.eventMonth)}
          </p>

          {seasonStarted ? (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-app-coral" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t.account.progressLabel
                  .replace("{done}", String(actsCount))
                  .replace("{total}", String(active.pledge_count))}
              </p>
            </>
          ) : (
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t.account.seasonCountdownEyebrow}
              </p>
              <div className="flex items-end gap-3">
                {[
                  { v: timeLeft.days, l: "D" },
                  { v: timeLeft.hours, l: "H" },
                  { v: timeLeft.minutes, l: "M" },
                  { v: timeLeft.seconds, l: "S" },
                ].map((u, i, arr) => (
                  <div key={u.l} className="flex items-end gap-3">
                    <div className="flex flex-col items-center">
                      <span className="font-sans text-xl font-extrabold leading-none tabular-nums text-app-coral">
                        {String(u.v).padStart(2, "0")}
                      </span>
                      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {u.l}
                      </span>
                    </div>
                    {i < arr.length - 1 && <span className="pb-3 text-app-coral/40">:</span>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] italic text-muted-foreground">
                {t.account.seasonCountdownCaption}
              </p>
            </div>
          )}

          <div className="mt-3">
            {editing === active.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draftText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setDraftText(raw);
                    const parsed = parseInt(raw, 10);
                    setDraft(Number.isFinite(parsed) ? Math.max(1, parsed) : 0);
                  }}
                  className={inputClass}
                />
                <button type="button" onClick={() => save(active.id)} className={primaryBtn}>
                  {t.account.save}
                </button>
                <button type="button" onClick={() => setEditing(null)} className={ghostBtn}>
                  {t.account.cancel}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(active.id);
                  setDraft(active.pledge_count);
                  setDraftText(String(active.pledge_count));
                }}
                className={ghostBtn}
              >
                {t.account.modify}
              </button>
            )}
          </div>

          {items.length > 1 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                {t.account.pastCommitments} ({items.length - 1})
              </summary>
              <ul className="mt-2 space-y-1 text-sm">
                {items.slice(1).map((c) => (
                  <li key={c.id} className="text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()} — {c.pledge_count}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
