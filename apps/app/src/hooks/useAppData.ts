import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/integrations/supabase/client";
import { useAuth } from "@shared/contexts/AuthContext";

/**
 * Live data for the installed-app screens at /app.
 *
 * Everything here comes from the backend: the signed-in user's profile, their
 * own acts, streaks and badges, plus public totals for the shared counters.
 * Personal queries stay disabled until a session exists, so signed-out visitors
 * never fire requests that RLS would reject.
 */

export interface AppMe {
  firstName: string;
  lastName: string;
  displayName: string;
  place: string;
  referralCode: string | null;
  actsPassedForward: number;
  dayStreak: number;
  longestStreak: number;
  pledged: number;
  peoplePassedTo: number;
  rippleActs: number;
  onboardingSeen: boolean;
  hasCommitment: boolean;
}

export function useAppMe() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["app", "me", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppMe> => {
      const uid = user!.id;

      const [profileRes, streakRes, pledgeRes, referralRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, first_name, last_name, country, referral_code, onboarding_seen")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase.rpc("user_streak", { _user_id: uid }),
        supabase.from("commitments").select("pledge_count").eq("user_id", uid),
        supabase.rpc("my_referral_stats"),
      ]);

      const profile = profileRes.data;
      const streak = Array.isArray(streakRes.data) ? streakRes.data[0] : streakRes.data;
      const referral = Array.isArray(referralRes.data) ? referralRes.data[0] : referralRes.data;

      const fallbackName = (user!.email ?? "friend").split("@")[0];
      const displayName = profile?.display_name?.trim() || fallbackName;

      return {
        firstName: profile?.first_name?.trim() || displayName.split(" ")[0],
        lastName: profile?.last_name?.trim() || "",
        displayName,
        place: profile?.country?.trim() || "Worldwide",
        referralCode: profile?.referral_code ?? null,
        actsPassedForward: Number(streak?.total_acts ?? 0),
        dayStreak: Number(streak?.current_streak ?? 0),
        longestStreak: Number(streak?.longest_streak ?? 0),
        pledged: (pledgeRes.data ?? []).reduce((sum, row) => sum + (row.pledge_count ?? 0), 0),
        peoplePassedTo: Number(referral?.joined_count ?? 0),
        rippleActs: Number(referral?.acts_count ?? 0),
        onboardingSeen: !!profile?.onboarding_seen,
        hasCommitment: (pledgeRes.data ?? []).length > 0,
      };
    },
  });
}

export interface AppAct {
  id: string;
  description: string;
  createdAt: string;
  mode: string;
  tags: string[];
}

/** The signed-in user's own most recent acts. */
export function useMyRecentActs(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["app", "my-acts", user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<AppAct[]> => {
      const { data, error } = await supabase
        .from("acts_of_kindness")
        .select("id, description, created_at, mode, tags")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        description: row.description ?? "An act of kindness",
        createdAt: row.created_at,
        mode: row.mode,
        tags: row.tags ?? [],
      }));
    },
  });
}

export interface WallAct extends AppAct {
  name: string;
  photoUrl: string | null;
}


/** Published acts from everyone — readable without a session. */
export function useWallActs(limit = 20) {
  return useQuery({
    queryKey: ["app", "wall", limit],
    queryFn: async (): Promise<WallAct[]> => {
      const { data, error } = await supabase
        .from("acts_of_kindness")
        .select("id, description, created_at, mode, tags, first_name, photo_paths")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const path = (row.photo_paths ?? [])[0];
        return {
          id: row.id,
          description: row.description ?? "An act of kindness",
          createdAt: row.created_at,
          mode: row.mode,
          tags: row.tags ?? [],
          name: row.first_name?.trim() || "Someone",
          photoUrl: path
            ? supabase.storage.from("kindness-photos").getPublicUrl(path).data.publicUrl
            : null,
        };
      });
    },
  });
}


export interface ReactionState {
  count: number;
  reacted: boolean;
}

function reactionsKey(actIds: string[]) {
  return ["app", "reactions", actIds.slice().sort().join(",")] as const;
}

/**
 * Heart-reaction counts (+ whether the signed-in user reacted) for a batch of
 * acts, via the existing reaction_counts/my_reactions RPCs and act_reactions
 * table — same infrastructure the website's Wall of Kindness already uses.
 * Returns a toggle() that updates optimistically before the network call
 * resolves, so a tap always feels instant.
 */
export function useActReactions(actIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = reactionsKey(actIds);

  const query = useQuery({
    queryKey: key,
    enabled: actIds.length > 0,
    queryFn: async (): Promise<Record<string, ReactionState>> => {
      const [{ data: countRows }, mineRows] = await Promise.all([
        supabase.rpc("reaction_counts", { _act_ids: actIds }),
        user
          ? supabase.rpc("my_reactions", { _act_ids: actIds }).then((r) => r.data ?? [])
          : Promise.resolve([]),
      ]);
      const counts: Record<string, number> = {};
      (countRows ?? []).forEach((r) => {
        counts[r.act_id] = Number(r.count) || 0;
      });
      const mine = new Set(mineRows.map((r) => r.act_id));

      const result: Record<string, ReactionState> = {};
      for (const id of actIds) {
        result[id] = { count: counts[id] ?? 0, reacted: mine.has(id) };
      }
      return result;
    },
  });

  const toggle = async (actId: string) => {
    if (!user) return false;
    const current = query.data?.[actId] ?? { count: 0, reacted: false };
    const next: ReactionState = {
      count: Math.max(0, current.count + (current.reacted ? -1 : 1)),
      reacted: !current.reacted,
    };
    queryClient.setQueryData(key, (prev: Record<string, ReactionState> | undefined) => ({
      ...prev,
      [actId]: next,
    }));

    const revert = () =>
      queryClient.setQueryData(key, (prev: Record<string, ReactionState> | undefined) => ({
        ...prev,
        [actId]: current,
      }));

    if (current.reacted) {
      const { error } = await supabase
        .from("act_reactions")
        .delete()
        .eq("act_id", actId)
        .eq("user_id", user.id)
        .eq("reaction", "heart");
      if (error) revert();
    } else {
      const { error } = await supabase
        .from("act_reactions")
        .insert({ act_id: actId, user_id: user.id, reaction: "heart" });
      if (error && !String(error.message).includes("duplicate")) revert();
    }
    return true;
  };

  return { reactions: query.data ?? {}, toggle };
}

/** Which of these acts the signed-in user has already sent a "thanks" for
 *  (or, from the giver's side, which of their own acts have been thanked —
 *  since only one specific recipient can ever thank a given act, "has any
 *  thanks row" and "did I as the recipient send it" are the same check). */
export function useThanksForActs(actIds: string[]) {
  return useQuery({
    queryKey: ["app", "thanks", actIds.slice().sort().join(",")],
    enabled: actIds.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from("thanks").select("act_id").in("act_id", actIds);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.act_id));
    },
  });
}

export interface ReceivedAct extends AppAct {
  fromName: string;
}

/** Acts passed to the signed-in user via a /wave hand-off (to_user_id = them).
 *  Regular acts never have to_user_id set, so they never appear here. */
export function useActsReceivedByMe(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["app", "received-acts", user?.id, limit],
    enabled: !!user,
    queryFn: async (): Promise<ReceivedAct[]> => {
      const { data, error } = await supabase
        .from("acts_of_kindness")
        .select("id, description, created_at, mode, tags, first_name")
        .eq("to_user_id", user!.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        description: row.description ?? "An act of kindness",
        createdAt: row.created_at,
        mode: row.mode,
        tags: row.tags ?? [],
        fromName: row.first_name?.trim() || "a fellow member",
      }));
    },
  });
}

/** Sends a one-tap "thanks" for an act received via a hand-off. Invalidates
 *  the thanks query on success so both sides' badges update. */
export function useSendThanks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return async (actId: string) => {
    if (!user) return { error: "Not signed in" };
    const { error } = await supabase.from("thanks").insert({ act_id: actId, from_user_id: user.id });
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["app", "thanks"] });
    }
    return { error: error?.message ?? null };
  };
}

/** Public movement totals used by the shared counters. */
export function useMovementTotals() {
  return useQuery({
    queryKey: ["app", "totals"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [all, today, pledges] = await Promise.all([
        supabase
          .from("acts_of_kindness")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("acts_of_kindness")
          .select("id", { count: "exact", head: true })
          .eq("status", "published")
          .gte("created_at", startOfDay.toISOString()),
        supabase.from("commitments").select("pledge_count").eq("status", "published"),
      ]);

      return {
        actsAllTime: all.count ?? 0,
        actsToday: today.count ?? 0,
        pledged: (pledges.data ?? []).reduce((sum, row) => sum + (row.pledge_count ?? 0), 0),
      };
    },
  });
}

export interface AppBadge {
  id: string;
  name: string;
  description: string | null;
  earned: boolean;
  current: number | null;
  target: number | null;
}

/** Badge catalogue joined with what the signed-in user has earned. */
export function useAppBadges() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["app", "badges", user?.id],
    queryFn: async (): Promise<AppBadge[]> => {
      const catalogue = await supabase
        .from("badges")
        .select("id, name, description, sort_order")
        .order("sort_order", { ascending: true });
      if (catalogue.error) throw catalogue.error;

      let earned = new Set<string>();
      let progress = new Map<string, { current: number; target: number }>();

      if (user) {
        const [mine, prog] = await Promise.all([
          supabase.from("user_badges").select("badge_id").eq("user_id", user.id),
          supabase.rpc("act_badge_progress", { _user_id: user.id }),
        ]);
        earned = new Set((mine.data ?? []).map((row) => row.badge_id));
        progress = new Map(
          (prog.data ?? []).map((row) => [
            row.badge_id,
            { current: Number(row.current_count ?? 0), target: Number(row.target ?? 0) },
          ]),
        );
      }

      return (catalogue.data ?? []).map((badge) => {
        const p = progress.get(badge.id);
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          earned: earned.has(badge.id),
          current: p?.current ?? null,
          target: p?.target ?? null,
        };
      });
    },
  });
}

export interface CountryCount {
  country: string;
  acts: number;
  commitments: number;
}

/** Per-country act + commitment counts powering the /app map. */
export function useKindnessMapCounts() {
  return useQuery({
    queryKey: ["app", "map-counts"],
    queryFn: async (): Promise<CountryCount[]> => {
      const { data, error } = await supabase.rpc("kindness_map_counts");
      if (error) throw error;
      return ((data ?? []) as CountryCount[])
        .filter((row) => !!row.country)
        .map((row) => ({
          country: row.country,
          acts: Number(row.acts ?? 0),
          commitments: Number(row.commitments ?? 0),
        }));
    },
  });
}
