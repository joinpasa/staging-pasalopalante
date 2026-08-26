import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, Check } from "lucide-react";

const FEATURE_KEY = "reminders";

const RemindersCard = ({ userId, email }: { userId: string; email: string }) => {
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("feature_interest")
        .select("id")
        .eq("user_id", userId)
        .eq("feature_key", FEATURE_KEY)
        .maybeSingle();
      if (!cancelled) {
        setJoined(!!data);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const join = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("feature_interest")
      .insert({ user_id: userId, feature_key: FEATURE_KEY, email: email || null });
    setSubmitting(false);
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      toast.error(error.message);
      return;
    }
    setJoined(true);
    toast.success("You're on the waitlist!");
  };

  return (
    <section className="bg-background border border-border rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Bell size={20} className="text-terracotta" />
        <h2 className="font-serif text-2xl">Streak Reminders?<br />Join the Waitlist.</h2>
      </div>

      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : joined ? (
        <div className="flex items-start gap-3 mt-3 p-4 rounded-xl bg-sage/10 border border-sage/20">
          <Check size={20} className="text-sage mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">You're on the waitlist.</p>
            <p className="text-sm text-foreground/70 mt-1">
              We'll email you the moment reminders go live. No need to sign up again.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-foreground/70 text-sm mb-5">
            Should we develop a reminders feature? Click below to vote and join the waitlist.
            We'll let you know when the feature goes live.
          </p>
          <Button onClick={join} disabled={submitting}>
            {submitting ? "Saving…" : "Vote and join the waitlist"}
          </Button>
        </>
      )}
    </section>
  );
};

export default RemindersCard;
