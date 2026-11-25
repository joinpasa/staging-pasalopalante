import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HUB_LIVE, hubDb, SUPABASE_KEY, SUPABASE_URL } from "./client";

/*
 * The team's side of the Partners Hub (partners.passkindnessforward.com, 25 Nov 2026): what
 * members post and send us, the weekly update, the kit and the member list. Reads and writes go
 * straight to the tables in supabase/migrations/20261125120000_partners_hub.sql as the signed-in
 * hub member; the access rules there decide what the team may change.
 */

export const PARTNERS_HUB_URL = "https://partners.passkindnessforward.com";

export type MemberKind = "organisation" | "company" | "ambassador";
export const kindOf = (orgType: string | null | undefined): MemberKind => (orgType === "company" ? "company" : orgType === "ambassador" ? "ambassador" : "organisation");
export const KIND_LABEL: Record<MemberKind, string> = { organisation: "Organisation", company: "Company", ambassador: "Ambassador" };
export const KIND_COLOR: Record<MemberKind, string> = { organisation: "#00a3e0", company: "#d81b60", ambassador: "#c48a00" };

function need<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

async function signMedia(paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data } = await hubDb.storage.from("partner-media").createSignedUrls(unique, 3600);
  for (const u of data ?? []) if (u.path && u.signedUrl) out.set(u.path, u.signedUrl);
  return out;
}

export function kitPublicUrl(path: string | null | undefined) {
  return path ? `${SUPABASE_URL}/storage/v1/object/public/partner-kit/${path.split("/").map(encodeURIComponent).join("/")}` : null;
}

// ---------- posts and stories ----------

export interface PHPost {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_org_type: string | null;
  partner_country: string | null;
  partner_city: string | null;
  staff_name: string | null;
  audience: "community" | "team";
  kind: "post" | "testimonial" | "video";
  body: string;
  media: { path: string; type: "image" | "video"; name: string; url?: string }[];
  created_at: string;
  used_at: string | null;
  used_url: string | null;
  hidden_at: string | null;
  hidden_note: string | null;
  story_id: string | null;
  shows_minors: boolean;
  consent_share: boolean;
  consent_people: boolean;
  consent_text: string | null;
  hearts: number;
  comments: number;
}

export function usePHPosts(audience: "community" | "team" | null) {
  return useQuery({
    queryKey: ["ph-posts", audience],
    enabled: HUB_LIVE,
    queryFn: async (): Promise<PHPost[]> => {
      const rows = need(await hubDb.rpc("partner_feed", { _limit: 100, _audience: audience, _include_hidden: true })) as PHPost[];
      const signed = await signMedia(rows.flatMap((r) => (r.media ?? []).map((m) => m.path)));
      return rows.map((r) => ({ ...r, media: (r.media ?? []).map((m) => ({ ...m, url: signed.get(m.path) })) }));
    },
  });
}

async function myMemberId(): Promise<string | null> {
  const { data } = await hubDb.rpc("hub_me");
  return (data as string | null) ?? null;
}

export function usePostActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["ph-posts"] });
  return {
    hide: useMutation({
      mutationFn: async ({ id, note }: { id: string; note: string }) => {
        const me = await myMemberId();
        need(await hubDb.from("partner_posts").update({ hidden_at: new Date().toISOString(), hidden_by: me, hidden_note: note || null }).eq("id", id).select("id"));
      },
      onSuccess: done,
    }),
    unhide: useMutation({
      mutationFn: async (id: string) => {
        need(await hubDb.from("partner_posts").update({ hidden_at: null, hidden_by: null, hidden_note: null }).eq("id", id).select("id"));
      },
      onSuccess: done,
    }),
    markShared: useMutation({
      mutationFn: async ({ id, url }: { id: string; url: string }) => {
        const clean = url.trim() ? (/^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`) : null;
        need(await hubDb.from("partner_posts").update({ used_at: new Date().toISOString(), used_url: clean }).eq("id", id).select("id"));
      },
      onSuccess: done,
    }),
    reply: useMutation({
      mutationFn: async ({ id, body }: { id: string; body: string }) => {
        const me = await myMemberId();
        if (!me) throw new Error("Only hub members can reply.");
        need(await hubDb.from("partner_post_comments").insert({ post_id: id, team_member_id: me, body: body.trim() }).select("id"));
      },
      onSuccess: () => {
        done();
        qc.invalidateQueries({ queryKey: ["ph-comments"] });
      },
    }),
    /** Copies the post's first file into the story bank, with the partner's consent attached. */
    toStoryBank: useMutation({
      mutationFn: async (p: PHPost) => {
        const me = await myMemberId();
        const first = p.media[0];
        let path: string | null = null;
        let mime: string | null = null;
        if (first) {
          const { data: blob, error } = await hubDb.storage.from("partner-media").download(first.path);
          if (error || !blob) throw new Error("The file could not be read. Try again.");
          mime = blob.type || (first.type === "video" ? "video/mp4" : "image/jpeg");
          path = `stories/partners-hub/${p.id}-${(first.name || first.path.split("/").pop() || "file").toLowerCase().replace(/[^\w.-]+/g, "-")}`;
          const up = await hubDb.storage.from("hub-media").upload(path, blob, { contentType: mime, upsert: true });
          if (up.error) throw new Error(up.error.message);
        }
        const kind = first ? (first.type === "video" ? "clip" : "photo") : "words";
        const story = need(
          await hubDb
            .from("hub_stories")
            .insert({
              kind,
              title: (p.body || `${p.partner_name} story`).slice(0, 80),
              path,
              mime,
              words: p.body || null,
              people: p.staff_name ?? "",
              source: "Partners Hub",
              partner: p.partner_name,
              country: p.partner_country,
              tags: ["partners-hub", p.audience === "team" ? "sent-to-us" : "community", p.kind],
              consent: "partner",
              consent_note: `Ticked in the Partners Hub on ${new Date(p.created_at).toLocaleString("en-GB")}: ${p.consent_text ?? "consent boxes"}`,
              minors: p.shows_minors,
              credit: p.partner_name,
              added_by: me,
            })
            .select("id")
            .single(),
        ) as { id: string };
        need(await hubDb.from("partner_posts").update({ story_id: story.id }).eq("id", p.id).select("id"));
        return story.id;
      },
      onSuccess: done,
    }),
  };
}

export interface PHComment {
  id: string;
  body: string;
  created_at: string;
  author: string;
  team: boolean;
  hidden_at: string | null;
}

export function usePHComments(postId: string | null) {
  return useQuery({
    queryKey: ["ph-comments", postId],
    enabled: HUB_LIVE && !!postId,
    queryFn: async () => need(await hubDb.rpc("partner_comments", { _post_id: postId })) as PHComment[],
  });
}

// ---------- weekly updates ----------

export type UpdateItemKind = "kit" | "ask" | "news" | "moment";
export interface PHUpdateItem {
  kind: UpdateItemKind;
  text: string;
  textEs?: string;
  link?: string;
}
export interface PHUpdate {
  id?: string;
  week_start: string;
  title: string;
  title_es: string;
  intro: string;
  intro_es: string;
  items: PHUpdateItem[];
  spotlight_partner_id: string | null;
  spotlight_text: string | null;
  spotlight_text_es: string | null;
  published_at?: string | null;
}

export function useUpdatesList() {
  return useQuery({
    queryKey: ["ph-updates"],
    enabled: HUB_LIVE,
    queryFn: async () => need(await hubDb.from("partner_updates").select("*").order("week_start", { ascending: false }).limit(40)) as PHUpdate[],
  });
}

export function useSaveUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ update, publish }: { update: PHUpdate; publish?: boolean | null }) => {
      const row: Record<string, unknown> = {
        week_start: update.week_start,
        title: update.title,
        title_es: update.title_es,
        intro: update.intro,
        intro_es: update.intro_es,
        items: update.items.filter((i) => i.text.trim()),
        spotlight_partner_id: update.spotlight_partner_id || null,
        spotlight_text: update.spotlight_text || null,
        spotlight_text_es: update.spotlight_text_es || null,
      };
      if (publish === true) row.published_at = new Date().toISOString();
      if (publish === false) row.published_at = null;
      if (update.id) return need(await hubDb.from("partner_updates").update(row).eq("id", update.id).select("*").single()) as PHUpdate;
      const me = await myMemberId();
      return need(await hubDb.from("partner_updates").insert({ ...row, created_by: me }).select("*").single()) as PHUpdate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ph-updates"] }),
  });
}

// ---------- kit ----------

export interface PHKitItem {
  id: string;
  title: string;
  title_es: string | null;
  description: string | null;
  section: string;
  audience: "all" | MemberKind;
  lang: "en" | "es" | "both";
  file_path: string | null;
  thumb_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  caption: string | null;
  caption_es: string | null;
  sort: number;
  hidden: boolean;
  added_at: string;
}

export function useKitList() {
  return useQuery({
    queryKey: ["ph-kit"],
    enabled: HUB_LIVE,
    queryFn: async () => need(await hubDb.from("partner_kit_items").select("*").order("sort").order("added_at", { ascending: false })) as PHKitItem[],
  });
}

export function useKitActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["ph-kit"] });
  return {
    add: useMutation({
      mutationFn: async ({ file, thumb, fields }: { file: File | null; thumb: File | null; fields: Partial<PHKitItem> }) => {
        const put = async (f: File) => {
          const path = `kit/${Date.now().toString(36)}-${f.name.toLowerCase().replace(/[^\w.-]+/g, "-")}`;
          const up = await hubDb.storage.from("partner-kit").upload(path, f, { contentType: f.type || undefined, upsert: false, cacheControl: "86400" });
          if (up.error) throw new Error(up.error.message);
          return path;
        };
        const file_path = file ? await put(file) : null;
        const thumb_path = thumb ? await put(thumb) : null;
        need(
          await hubDb
            .from("partner_kit_items")
            .insert({ ...fields, file_path, thumb_path, mime: file?.type || null, size_bytes: file?.size ?? null })
            .select("id"),
        );
      },
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: async ({ id, fields }: { id: string; fields: Partial<PHKitItem> }) => {
        need(await hubDb.from("partner_kit_items").update(fields).eq("id", id).select("id"));
      },
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: async (item: PHKitItem) => {
        need(await hubDb.from("partner_kit_items").delete().eq("id", item.id).select("id"));
        const paths = [item.file_path, item.thumb_path].filter((p): p is string => !!p);
        if (paths.length) await hubDb.storage.from("partner-kit").remove(paths);
      },
      onSuccess: done,
    }),
  };
}

// ---------- members ----------

export interface PHMember {
  id: string;
  name: string;
  org_type: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  contact_email: string | null;
  contact_name: string | null;
  logo_path: string | null;
  entry_logo_url: string | null;
  website: string | null;
  pledge_goal: number;
  pledge_waiting: number;
  staff: number;
  joined: boolean;
  last_login: string | null;
  acts: number;
  posts: number;
  last_post: string | null;
  invite_url: string;
  welcome_sent_at: string | null;
}

/** Emails a member the Partners Hub welcome (their link, and how to sign in by email next time). */
export async function sendWelcomeEmail(partnerId: string): Promise<string> {
  const { data } = await hubDb.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/partner-auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ action: "send_welcome", partner_id: partnerId }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.error ?? "The welcome email didn't go out. Try again.");
  return String(out.to ?? "");
}

export function useMembers() {
  return useQuery({
    queryKey: ["ph-members"],
    enabled: HUB_LIVE,
    queryFn: async () => {
      const rows = need(await hubDb.rpc("hub_partners")) as PHMember[];
      return rows.map((r) => ({ ...r, pledge_waiting: Number(r.pledge_waiting) || 0, acts: Number(r.acts) || 0 }));
    },
  });
}

export interface PHPledgeAdd {
  id: string;
  partner_id: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export function usePledgeWaiting() {
  return useQuery({
    queryKey: ["ph-pledges"],
    enabled: HUB_LIVE,
    queryFn: async () => need(await hubDb.from("partner_pledge_adds").select("id, partner_id, amount, note, created_at").is("counted_at", null).order("created_at")) as PHPledgeAdd[],
  });
}

export function useMemberActions() {
  const qc = useQueryClient();
  return {
    add: useMutation({
      mutationFn: async (m: { name: string; orgType: string; email: string; contactName: string; country: string; pledge: number }) => {
        const row = (need(
          await hubDb.rpc("hub_add_member", {
            _name: m.name,
            _org_type: m.orgType,
            _contact_email: m.email,
            _contact_name: m.contactName,
            _country: m.country,
            _pledge_goal: m.pledge,
          }),
        ) as { id: string; invite_url: string }[])[0];
        // with an email, the welcome email goes out straight away
        let emailed: string | null = null;
        if (m.email.trim()) emailed = await sendWelcomeEmail(row.id).catch(() => null);
        return { ...row, emailed };
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ["ph-members"] }),
    }),
    welcome: useMutation({
      mutationFn: (id: string) => sendWelcomeEmail(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["ph-members"] }),
    }),
    setKind: useMutation({
      mutationFn: async ({ id, orgType }: { id: string; orgType: string }) => {
        need(await hubDb.rpc("hub_update_member", { _id: id, _org_type: orgType, _contact_email: null, _contact_name: null }));
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ["ph-members"] }),
    }),
    counted: useMutation({
      mutationFn: async (ids: string[]) => {
        need(await hubDb.from("partner_pledge_adds").update({ counted_at: new Date().toISOString() }).in("id", ids).select("id"));
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["ph-pledges"] });
        qc.invalidateQueries({ queryKey: ["ph-members"] });
      },
    }),
  };
}
