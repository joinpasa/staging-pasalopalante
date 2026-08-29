import { useEffect, useState } from "react";
import { supabase } from "@shared/integrations/supabase/client";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Skeleton } from "@shared/components/ui/skeleton";
import { toast } from "sonner";

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

const YourCommitment = ({ userId, email }: { userId: string; email: string }) => {
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
    // Only personal commitments here. handle_new_user / claim_my_acts links
    // any pre-signup email-only commitments to user_id, so filtering by
    // user_id alone is sufficient and avoids referencing the email column
    // (which is restricted by column-level grants).
    const q = supabase
      .from("commitments")
      .select("id, pledge_count, type, created_at")
      .eq("type", "individual")
      .eq("user_id", userId);
    const { data } = await q.order("created_at", { ascending: false });
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
    const { error } = await supabase
      .from("commitments")
      .update({ pledge_count: draft })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t.account.saved);
      setEditing(null);
      load();
    }
  };

  const submitNew = async () => {
    if (newCount < 1 || !email) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-commitment", {
        body: {
          type: "individual",
          email,
          pledge_count: newCount,
        },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "Could not save");
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
  const progress = active
    ? Math.min(100, Math.round((actsCount / active.pledge_count) * 100))
    : 0;

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <h2 className="font-serif text-2xl mb-6">{t.account.commitmentHeading}</h2>

      {items === null ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : !active ? (
        creating ? (
          <div className="space-y-4">
            <p className="text-foreground/80">
              {t.account.personalCommitmentIntro.replace("{month}", t.account.eventMonth)}
            </p>
            <div>
              <Label className="sr-only" htmlFor="new-pledge">
                {t.account.commitmentHeading}
              </Label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRESETS.map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => {
                      setNewCount(n);
                      setNewCountText(String(n));
                    }}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      newCount === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <Input
                  id="new-pledge"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000000000}
                  value={newCountText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setNewCountText(raw);
                    const parsed = parseInt(raw, 10);
                    if (Number.isFinite(parsed)) setNewCount(Math.min(1000000000, Math.max(1, parsed)));
                  }}
                  onBlur={() => {
                    const parsed = parseInt(newCountText, 10);
                    const next = Number.isFinite(parsed) ? Math.min(1000000000, Math.max(1, parsed)) : 1;
                    setNewCount(next);
                    setNewCountText(String(next));
                  }}
                  className="w-28"
                />

              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.account.personalCommitmentNote}
            </p>
            <div className="flex gap-2">
              <Button onClick={submitNew} disabled={submitting}>
                {t.account.submitPersonalCommitment}
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                {t.account.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-foreground/60 mb-4">{t.account.emptyCommitment}</p>
            <Button onClick={() => setCreating(true)}>
              {t.account.makePersonalCommitment}
            </Button>
          </div>
        )
      ) : (
        <div>
          <p className="text-foreground/80 mb-3">
            {t.account.commitmentBody
              .replace("{count}", String(active.pledge_count))
              .replace("{month}", t.account.eventMonth)}
          </p>

          {seasonStarted ? (
            <>
              <div className="w-full bg-muted rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="bg-warm-terracotta h-full rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-foreground/60 mb-4">
                {t.account.progressLabel
                  .replace("{done}", String(actsCount))
                  .replace("{total}", String(active.pledge_count))}
              </p>
            </>
          ) : (
            <div className="mb-4 mt-4">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                {t.account.seasonCountdownEyebrow}
              </p>
              <div className="flex items-end gap-3 md:gap-4">
                {[
                  { v: timeLeft.days, l: "D" },
                  { v: timeLeft.hours, l: "H" },
                  { v: timeLeft.minutes, l: "M" },
                  { v: timeLeft.seconds, l: "S" },
                ].map((u, i, arr) => (
                  <div key={u.l} className="flex items-end gap-3 md:gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className="text-xl md:text-2xl font-medium text-warm-terracotta tabular-nums leading-none"
                        style={{ fontFamily: "'DM Serif Display', serif" }}
                      >
                        {String(u.v).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] tracking-widest uppercase text-muted-foreground mt-1">
                        {u.l}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-lg md:text-xl text-warm-terracotta/40 leading-none pb-3">:</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground italic mt-2">
                {t.account.seasonCountdownCaption}
              </p>
            </div>
          )}

          {editing === active.id ? (
            <div className="flex gap-2 items-center">
              <Input
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
                className="w-32"
              />
              <Button size="sm" onClick={() => save(active.id)}>
                {t.account.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                {t.account.cancel}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(active.id);
                setDraft(active.pledge_count);
                setDraftText(String(active.pledge_count));
              }}
            >
              {t.account.modify}
            </Button>
          )}

          {items.length > 1 && (
            <details className="mt-6">
              <summary className="text-sm text-foreground/60 cursor-pointer">
                {t.account.pastCommitments} ({items.length - 1})
              </summary>
              <ul className="mt-3 space-y-1 text-sm">
                {items.slice(1).map((c) => (
                  <li key={c.id} className="text-foreground/70">
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
};

export default YourCommitment;
