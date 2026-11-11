import { useEffect, useState } from "react";
import { supabasePublic } from "@shared/integrations/supabase/publicClient";

export interface LiveStreamState {
  /** loading: first answer pending · live: a stream is on air · none: nothing live ·
   * error: the lookup is unavailable (caller falls back to a pinned video). */
  status: "loading" | "live" | "none" | "error";
  videoId?: string;
  title?: string;
  /** False when YouTube won't let that stream be embedded: link out instead. */
  embeddable?: boolean;
}

/**
 * Asks the live-stream edge function which of the channel's streams is live,
 * every 30 s while `active`. The function does the YouTube Data API call and
 * caches it, so any number of viewers is one API lookup per 30 s.
 */
export function useLiveStream(active: boolean, intervalMs = 30_000): LiveStreamState {
  const [state, setState] = useState<LiveStreamState>({ status: "loading" });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabasePublic.functions.invoke("live-stream", { method: "GET" });
        if (cancelled) return;
        if (error || !data || (data as { error?: string }).error) throw error ?? new Error("lookup failed");
        const d = data as { status: "live" | "none"; videoId?: string; title?: string; embeddable?: boolean };
        setState((prev) =>
          prev.status === d.status && prev.videoId === d.videoId && prev.embeddable === d.embeddable
            ? prev
            : { status: d.status, videoId: d.videoId, title: d.title, embeddable: d.embeddable },
        );
      } catch {
        // Keep showing the last good answer if we had one; otherwise report the failure.
        if (!cancelled) setState((prev) => (prev.status === "live" || prev.status === "none" ? prev : { status: "error" }));
      }
    };
    void load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active, intervalMs]);

  return state;
}
