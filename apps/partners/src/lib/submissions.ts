import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callFunction, portal } from "./portalClient";
import { useSession } from "./session";
import type { UploadedMedia } from "./upload";

export type SubmissionStatus = "pending" | "approved" | "changes_requested" | "rejected";

export interface Submission {
  id: string;
  description: string;
  people_count: number;
  act_date: string;
  status: SubmissionStatus;
  review_note: string | null;
  media: UploadedMedia[];
  link_url: string | null;
  created_at: string;
  /** Signed URL of the first photo, for the row thumbnail. */
  thumbUrl: string | null;
}

export interface PartnerSummary {
  pledge_goal: number;
}

export function usePartnerSummary() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["partner", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<PartnerSummary> => {
      const { data, error } = await portal.from("partners").select("pledge_goal").eq("id", partner!.id).single();
      if (error) throw error;
      return data as PartnerSummary;
    },
  });
}

export function useSubmissions() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["submissions", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<Submission[]> => {
      const { data, error } = await portal
        .from("partner_submissions")
        .select("id, description, people_count, act_date, status, review_note, media, link_url, created_at")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as Omit<Submission, "thumbUrl">[];

      // Thumbnails for the first rows that have a photo (one signing call).
      const thumbPaths = rows
        .slice(0, 50)
        .map((r) => r.media?.find((m) => m.type === "image")?.path)
        .filter((p): p is string => !!p);
      const signed = new Map<string, string>();
      if (thumbPaths.length) {
        const { data: urls } = await portal.storage.from("partner-media").createSignedUrls(thumbPaths, 60 * 60);
        for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
      }
      return rows.map((r) => {
        const p = r.media?.find((m) => m.type === "image")?.path;
        return { ...r, thumbUrl: p ? signed.get(p) ?? null : null };
      });
    },
  });
}

/** Acts that count toward the pledge: everything except rejected. */
export function actsLogged(rows: Submission[] | undefined) {
  return (rows ?? []).filter((r) => r.status !== "rejected").reduce((sum, r) => sum + r.people_count, 0);
}

export interface NewAct {
  description: string;
  people_count: number;
  act_date: string;
  media: UploadedMedia[];
  link_url?: string;
}

export interface SubmitResult {
  activities: number;
  acts: number;
  /** True when this was an edit of a "Needs Changes" act. */
  resubmitted?: boolean;
}

export function useSubmitActs() {
  const { session, staff } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, consent, editId }: { items: NewAct[]; consent: boolean; editId?: string }) => {
      const { data } = await portal.auth.getSession();
      const token = data.session?.access_token ?? session?.access_token;
      const body = editId
        ? { action: "update", staff_id: staff?.id, submission_id: editId, media_consent: consent, item: items[0] }
        : { staff_id: staff?.id, media_consent: consent, items };
      return callFunction<SubmitResult>("partner-submit", body, token);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

/** Loose check before sending — the server validates properly. */
export function isValidLink(value: string) {
  const v = value.trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
