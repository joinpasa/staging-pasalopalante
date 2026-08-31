import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";

interface Act {
  id: string;
  description: string | null;
  created_at: string;
}

function minutesAgo(iso: string): number {
  return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const LiveFromWall = () => {
  const { t } = useLanguage();
  const [acts, setActs] = useState<Act[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("acts_of_kindness")
        .select("id, description, created_at")
        .eq("status", "published")
        .not("description", "is", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (!cancelled) setActs((data as Act[]) || []);
    })();
    return () => { cancelled = true; };
  }, []);

  if (acts && acts.length === 0) return null;

  return (
    <section className="bg-white section-padding py-14 md:py-20">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-7">
          {t.liveWall.eyebrow}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {(acts ?? [1, 2, 3]).map((act, i) => (
            <div
              key={acts ? (act as Act).id : i}
              className="flex gap-3.5 bg-warm-cream border border-border rounded-2xl p-6"
            >
              <div className="shrink-0 w-[38px] h-[38px] rounded-full bg-warm-blush grid place-items-center">
                <Heart size={17} className="text-primary fill-current" />
              </div>
              <div className="min-w-0">
                {acts ? (
                  <>
                    <p className="text-[15px] leading-snug text-foreground line-clamp-3">
                      {(act as Act).description}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {t.liveWall.minutesAgo.replace("{n}", String(minutesAgo((act as Act).created_at)))}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-3.5 bg-border/60 rounded animate-pulse mb-2 w-full" />
                    <div className="h-3.5 bg-border/60 rounded animate-pulse w-2/3" />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveFromWall;
