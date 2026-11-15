import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HUB_LIVE } from "./client";
import { createLiveStore } from "./live";
import { createDemoStore, type HubStore } from "./store";

interface Ctx {
  store: HubStore;
  /** the card open in the side panel, if any */
  openId: string | null;
  open: (id: string | null) => void;
  /** the scheduled or published post open in its panel, if any */
  postId: string | null;
  openPost: (id: string | null) => void;
  /** the story open in its panel, if any */
  storyId: string | null;
  openStory: (id: string | null) => void;
}

const HubCtx = createContext<Ctx | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => (HUB_LIVE ? createLiveStore() : createDemoStore()), []);
  // A card can be shared as a link: /pipeline?card=<id> opens it straight away.
  const [openId, setOpenId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("card"));
  const open = useCallback((id: string | null) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("card", id);
    else url.searchParams.delete("card");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  const [postId, openPost] = useState<string | null>(() => new URLSearchParams(window.location.search).get("post"));
  const [storyId, openStory] = useState<string | null>(() => new URLSearchParams(window.location.search).get("story"));
  const value = useMemo(() => ({ store, openId, open, postId, openPost, storyId, openStory }), [store, openId, open, postId, storyId]);
  return <HubCtx.Provider value={value}>{children}</HubCtx.Provider>;
}

export function useHub(): Ctx {
  const ctx = useContext(HubCtx);
  if (!ctx) throw new Error("useHub must be used inside HubProvider");
  return ctx;
}

const q = <T,>(key: string, fn: (s: HubStore) => Promise<T>) =>
  function useHubQuery() {
    const { store } = useHub();
    return useQuery({ queryKey: ["hub", key], queryFn: () => fn(store) });
  };

export const useItems = q("items", (s) => s.items());
export const useMembers = q("members", (s) => s.members());
export const useAccounts = q("accounts", (s) => s.accounts());
export const useMe = q("me", (s) => s.me());
export const useBriefs = q("briefs", (s) => s.briefs());
export const useSuggestions = q("suggestions", (s) => s.suggestions());
export const useGhlPosts = q("posts", (s) => s.ghlPosts());
export const useEmails = q("emails", (s) => s.emails());
export const useCommunity = q("community", (s) => s.community());
export const useKit = q("kit", (s) => s.kit());
export const useStats = q("stats", (s) => s.stats());
export const useStories = q("stories", (s) => s.stories());
export const useTasks = q("tasks", (s) => s.tasks());
export const useVideos = q("videos", (s) => s.videos());
export const useInbox = q("inbox", (s) => s.inbox());
export const usePledges = q("pledges", (s) => s.pledges());

/**
 * Run a change against the store, then refresh every screen.
 * Problems come back as a plain sentence in a toast, never a stack trace.
 */
export function useAct() {
  const { store } = useHub();
  const qc = useQueryClient();
  return useCallback(
    async <T,>(fn: (s: HubStore) => Promise<T>, done?: string): Promise<T | undefined> => {
      try {
        const res = await fn(store);
        await qc.invalidateQueries({ queryKey: ["hub"] });
        if (done) toast.success(done);
        return res;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
        return undefined;
      }
    },
    [store, qc],
  );
}
