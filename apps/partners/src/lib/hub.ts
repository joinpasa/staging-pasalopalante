import { useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portal, SUPABASE_URL } from "./portalClient";
import { useSession } from "./session";
import { kindOf, type Kind } from "./kinds";
import type { UploadedMedia } from "./upload";
import type { PartnerEvent } from "./events";
// Local preview only: compiled out of production builds (import.meta.env.DEV is false there).
const DEMO = import.meta.env.DEV && import.meta.env.VITE_PARTNERS_DEMO === "1";
const loadDemo = () => import("./demo").then((m) => m.demo);

/*
 * The Partners Hub's data (25 Nov 2026). Everything goes through the database functions in
 * supabase/migrations/20261125120000_partners_hub.sql, signed in as the member's one account.
 * In local preview with VITE_PARTNERS_DEMO=1 it reads made-up example data instead (see demo.ts).
 */

// ---------- files ----------

const MEDIA_BUCKET = "partner-media";

/** Public address of a file in the partner-kit store. */
export function kitFileUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/partner-kit/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Short-lived links for private partner files (photos, videos, logos), in one call. */
export async function signPaths(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p) && !p.startsWith("/")))];
  const out = new Map<string, string>();
  if (DEMO) {
    for (const p of unique) out.set(p, (await loadDemo()).fileUrl(p));
    return out;
  }
  if (!unique.length) return out;
  const { data } = await portal.storage.from(MEDIA_BUCKET).createSignedUrls(unique, 60 * 60);
  for (const u of data ?? []) if (u.path && u.signedUrl) out.set(u.path, u.signedUrl);
  return out;
}

function logoUrl(signed: Map<string, string>, logoPath: string | null, entryLogo: string | null) {
  if (logoPath) return signed.get(logoPath) ?? entryLogo ?? null;
  return entryLogo ?? null;
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await portal.rpc(fn, args);
  if (error) throw new Error(friendly(error.message));
  return data as T;
}

/** Database refusals are written to be read; strip the technical prefix if any. */
function friendly(message: string) {
  const m = message.replace(/^.*?ERROR:\s*/i, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
}

// ---------- who we are ----------

export interface Me {
  id: string;
  name: string;
  city: string | null;
  orgType: string | null;
  kind: Kind;
  country: string | null;
  region: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  about: string | null;
  contactName: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  pledgeGoal: number;
  pledgeAdded: number;
  pledgeTotal: number;
  profileUpdatedAt: string | null;
  joinedAt: string | null;
}

interface MeRow {
  id: string;
  name: string;
  city: string | null;
  org_type: string | null;
  country: string | null;
  region: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  about: string | null;
  contact_name: string | null;
  logo_path: string | null;
  entry_logo_url: string | null;
  pledge_goal: number;
  pledge_added: number | string;
  pledge_total: number | string;
  profile_updated_at: string | null;
  joined_at: string | null;
}

export function useMe() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["me", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<Me> => {
      const rows = DEMO ? [(await loadDemo()).me()] : await rpc<MeRow[]>("partner_me");
      const r = rows[0];
      if (!r) throw new Error("We couldn't find your organisation. Sign out and in again.");
      const signed = await signPaths([r.logo_path]);
      return {
        id: r.id,
        name: r.name,
        city: r.city,
        orgType: r.org_type,
        kind: kindOf(r.org_type),
        country: r.country,
        region: r.region,
        website: r.website,
        instagram: r.instagram,
        facebook: r.facebook,
        linkedin: r.linkedin,
        about: r.about,
        contactName: r.contact_name,
        logoPath: r.logo_path,
        logoUrl: logoUrl(signed, r.logo_path, r.entry_logo_url),
        pledgeGoal: Number(r.pledge_goal) || 0,
        pledgeAdded: Number(r.pledge_added) || 0,
        pledgeTotal: Number(r.pledge_total) || 0,
        profileUpdatedAt: r.profile_updated_at,
        joinedAt: r.joined_at,
      };
    },
  });
}

export interface ProfileInput {
  city: string;
  country: string;
  region: string;
  orgType: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  about: string;
  contactName: string;
  /** undefined keeps the current logo, "" removes it */
  logoPath?: string;
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: ProfileInput) => {
      const args = {
        _city: p.city,
        _country: p.country,
        _region: p.region,
        _org_type: p.orgType,
        _website: p.website,
        _instagram: p.instagram,
        _facebook: p.facebook,
        _linkedin: p.linkedin,
        _about: p.about,
        _contact_name: p.contactName,
        _logo_path: p.logoPath ?? null,
      };
      if (DEMO) return (await loadDemo()).saveProfile(args);
      await rpc("partner_update_profile", args);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

/**
 * Puts a logo (or, for an ambassador, a profile photo) in the member's own profile folder and hands
 * back its path. A logo is fitted inside a square; a photo is cropped to fill it.
 */
export async function uploadLogo(file: File, partnerId: string, mode: "logo" | "photo" = "logo"): Promise<string> {
  const blob = await squareLogo(file, mode === "photo");
  const path = `${partnerId}/profile/logo-${Date.now().toString(36)}.png`;
  if (DEMO) return (await loadDemo()).keepFile(path, blob);
  const { error } = await portal.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: "image/png", upsert: false });
  if (error) throw new Error("The logo didn't upload. Try a PNG or JPG under 10 MB.");
  return path;
}

/** Fits a logo inside 600 x 600 on a transparent background (or crops a photo to fill it), never stretched. */
async function squareLogo(file: File, fill = false): Promise<Blob> {
  if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) throw new Error("Choose a picture file (PNG, JPG or SVG).");
  if (file.size > 10 * 1024 * 1024) throw new Error("That picture is over 10 MB. Choose a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("We couldn't read that picture."));
      i.src = url;
    });
    const size = 600;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const w = img.naturalWidth || size;
    const h = img.naturalHeight || size;
    const scale = fill ? Math.max(size / w, size / h) : Math.min((size * 0.92) / w, (size * 0.92) / h);
    ctx.drawImage(img, (size - w * scale) / 2, (size - h * scale) / 2, w * scale, h * scale);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("We couldn't read that picture."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- pledge ----------

export interface PledgeAdd {
  id: string;
  amount: number;
  note: string | null;
  counted_at: string | null;
  created_at: string;
}

export function usePledgeAdds() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["pledge-adds", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<PledgeAdd[]> => {
      if (DEMO) return (await loadDemo()).pledgeAdds();
      const { data, error } = await portal
        .from("partner_pledge_adds")
        .select("id, amount, note, counted_at, created_at")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PledgeAdd[];
    },
  });
}

export function useAddPledge() {
  const { staff } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ amount, note }: { amount: number; note: string }) => {
      if (DEMO) return (await loadDemo()).addPledge(amount, note);
      return rpc<number>("partner_add_pledge", { _staff_id: staff?.id, _amount: amount, _note: note });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["pledge-adds"] });
    },
  });
}

// ---------- the team (people with a Kindness ID) ----------

export interface TeamPerson {
  id: string;
  name: string;
  last_login_at: string | null;
  created_at: string;
}

export function useTeam() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["team", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<TeamPerson[]> => {
      if (DEMO) return (await loadDemo()).team();
      const { data, error } = await portal
        .from("partner_staff")
        .select("id, name, last_login_at, created_at")
        .eq("partner_id", partner!.id)
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as TeamPerson[];
    },
  });
}

// ---------- the community ----------

export interface MediaItem extends UploadedMedia {
  url?: string;
}

export interface Post {
  id: string;
  partnerId: string;
  partnerName: string;
  orgType: string | null;
  kind: Kind;
  country: string | null;
  region: string | null;
  city: string | null;
  logoUrl: string | null;
  staffName: string | null;
  audience: "community" | "team";
  postKind: "post" | "testimonial" | "video";
  body: string;
  media: MediaItem[];
  linkUrl: string | null;
  createdAt: string;
  usedAt: string | null;
  usedUrl: string | null;
  hearts: number;
  hearted: boolean;
  comments: number;
  mine: boolean;
}

export interface FeedRow {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_org_type: string | null;
  partner_country: string | null;
  partner_region: string | null;
  partner_city: string | null;
  partner_logo_path: string | null;
  partner_entry_logo: string | null;
  staff_name: string | null;
  audience: "community" | "team";
  kind: "post" | "testimonial" | "video";
  body: string;
  media: UploadedMedia[];
  link_url: string | null;
  created_at: string;
  used_at: string | null;
  used_url: string | null;
  hearts: number;
  hearted: boolean;
  comments: number;
  mine: boolean;
}

export interface FeedFilter {
  kind?: Kind | null;
  partnerId?: string | null;
  country?: string | null;
  audience?: "community" | "team" | null;
  limit?: number;
  /** don't load anything (a member card with no hub account) */
  off?: boolean;
}

const KIND_ORG_TYPE: Record<Kind, string | null> = { organisation: null, company: "company", ambassador: "ambassador" };

async function toPosts(rows: FeedRow[]): Promise<Post[]> {
  const signed = await signPaths(rows.flatMap((r) => [r.partner_logo_path, ...(r.media ?? []).map((m) => m.path)]));
  return rows.map((r) => ({
    id: r.id,
    partnerId: r.partner_id,
    partnerName: r.partner_name,
    orgType: r.partner_org_type,
    kind: kindOf(r.partner_org_type),
    country: r.partner_country,
    region: r.partner_region,
    city: r.partner_city,
    logoUrl: logoUrl(signed, r.partner_logo_path, r.partner_entry_logo),
    staffName: r.staff_name,
    audience: r.audience,
    postKind: r.kind,
    body: r.body,
    media: (r.media ?? []).map((m) => ({ ...m, url: signed.get(m.path) })),
    linkUrl: r.link_url,
    createdAt: r.created_at,
    usedAt: r.used_at,
    usedUrl: r.used_url,
    hearts: Number(r.hearts) || 0,
    hearted: !!r.hearted,
    comments: Number(r.comments) || 0,
    mine: !!r.mine,
  }));
}

export function useFeed(filter: FeedFilter = {}) {
  const { partner, staff } = useSession();
  const limit = filter.limit ?? 12;
  return useInfiniteQuery({
    queryKey: ["feed", partner?.id, filter.kind ?? null, filter.country ?? null, filter.audience ?? null, filter.partnerId ?? null, limit],
    enabled: !!partner && !filter.off,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Post[]> => {
      let rows: FeedRow[];
      if (DEMO) rows = (await loadDemo()).feed();
      else
        rows = await rpc<FeedRow[]>("partner_feed", {
          _staff_id: staff?.id ?? null,
          _limit: filter.kind === "organisation" ? 100 : limit,
          _before: pageParam,
          _country: filter.country ?? null,
          _org_type: filter.kind ? KIND_ORG_TYPE[filter.kind] : null,
          _audience: filter.audience ?? null,
          _partner_id: filter.partnerId ?? null,
        });
      // "organisation" covers several org types, so it is narrowed here rather than in the query
      if (filter.kind) rows = rows.filter((r) => kindOf(r.partner_org_type) === filter.kind);
      if (DEMO && filter.country) rows = rows.filter((r) => r.partner_country === filter.country);
      if (DEMO && filter.audience) rows = rows.filter((r) => r.audience === filter.audience);
      if (DEMO && filter.partnerId) rows = rows.filter((r) => r.mine);
      return toPosts(rows.slice(0, limit));
    },
    getNextPageParam: (last) => (last.length >= limit ? last[last.length - 1].createdAt : null),
  });
}

export interface NewPost {
  audience: "community" | "team";
  postKind: "post" | "testimonial" | "video";
  body: string;
  media: UploadedMedia[];
  linkUrl?: string;
  consentShare: boolean;
  consentPeople: boolean;
  showsMinors: boolean;
  consentText: string;
}

export function useCreatePost() {
  const { staff } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: NewPost) => {
      const args = {
        _staff_id: staff?.id,
        _audience: p.audience,
        _kind: p.postKind,
        _body: p.body,
        _media: p.media,
        _link_url: p.linkUrl ?? null,
        _consent_share: p.consentShare,
        _consent_people: p.consentPeople,
        _shows_minors: p.showsMinors,
        _consent_text: p.consentText,
      };
      if (DEMO) return (await loadDemo()).createPost(args);
      return rpc<string>("partner_post_create", args);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (DEMO) return (await loadDemo()).deletePost(id);
      await rpc("partner_post_delete", { _post_id: id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export async function toggleHeart(postId: string, staffId: string | undefined) {
  if (DEMO) return (await loadDemo()).heart(postId);
  const rows = await rpc<{ hearted: boolean; hearts: number }[]>("partner_post_heart", { _post_id: postId, _staff_id: staffId });
  return rows[0];
}

export interface Comment {
  id: string;
  body: string;
  created_at: string;
  author: string;
  partner_name: string | null;
  team: boolean;
  mine: boolean;
}

export function useComments(postId: string, open: boolean) {
  return useQuery({
    queryKey: ["comments", postId],
    enabled: open,
    queryFn: async (): Promise<Comment[]> => (DEMO ? (await loadDemo()).comments(postId) : rpc<Comment[]>("partner_comments", { _post_id: postId })),
  });
}

export function useAddComment(postId: string) {
  const { staff } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (DEMO) return (await loadDemo()).addComment(postId, body);
      return rpc<string>("partner_comment_create", { _post_id: postId, _staff_id: staff?.id, _body: body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (DEMO) return (await loadDemo()).deleteComment(postId, id);
      await rpc("partner_comment_delete", { _comment_id: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// ---------- weekly updates ----------

export type UpdateItemKind = "kit" | "ask" | "news" | "moment";

export interface UpdateItem {
  kind: UpdateItemKind;
  text: string;
  textEs?: string;
  link?: string;
}

export interface Update {
  id: string;
  week_start: string;
  title: string;
  title_es: string;
  intro: string;
  intro_es: string;
  items: UpdateItem[];
  spotlight_partner_id: string | null;
  spotlight_text: string | null;
  spotlight_text_es: string | null;
  image_path: string | null;
  published_at: string;
}

export function useUpdates() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["updates", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<Update[]> => {
      if (DEMO) return (await loadDemo()).updates();
      const { data, error } = await portal
        .from("partner_updates")
        .select("id, week_start, title, title_es, intro, intro_es, items, spotlight_partner_id, spotlight_text, spotlight_text_es, image_path, published_at")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Update[];
    },
  });
}

export interface MemberCard {
  id: string;
  name: string;
  orgType: string | null;
  kind: Kind;
  country: string | null;
  region: string | null;
  city: string | null;
  logoUrl: string | null;
  about: string | null;
  website: string | null;
}

export function useMemberCard(id: string | null | undefined) {
  return useQuery({
    queryKey: ["member-card", id],
    enabled: !!id,
    queryFn: async (): Promise<MemberCard | null> => {
      const rows = DEMO
        ? (await loadDemo()).card(id!)
        : await rpc<
            {
              id: string;
              name: string;
              org_type: string | null;
              country: string | null;
              region: string | null;
              city: string | null;
              logo_path: string | null;
              entry_logo_url: string | null;
              about: string | null;
              website: string | null;
            }[]
          >("partner_card", { _partner_id: id });
      const r = rows[0];
      if (!r) return null;
      const signed = await signPaths([r.logo_path]);
      return {
        id: r.id,
        name: r.name,
        orgType: r.org_type,
        kind: kindOf(r.org_type),
        country: r.country,
        region: r.region,
        city: r.city,
        logoUrl: logoUrl(signed, r.logo_path, r.entry_logo_url),
        about: r.about,
        website: r.website,
      };
    },
  });
}

// ---------- the kit ----------

export interface KitItem {
  id: string;
  title: string;
  title_es: string | null;
  description: string | null;
  description_es: string | null;
  section: "start" | "social" | "profile" | "print" | "email" | "logos" | "video" | "other" | "outreach";
  audience: "all" | Kind;
  lang: "en" | "es" | "both";
  file_path: string | null;
  thumb_path: string | null;
  url: string | null;
  mime: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  caption_es: string | null;
  sort: number;
  added_at: string;
}

export function useKit() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["kit", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<KitItem[]> => {
      if (DEMO) return (await loadDemo()).kit();
      const { data, error } = await portal
        .from("partner_kit_items")
        .select("id, title, title_es, description, description_es, section, audience, lang, file_path, thumb_path, url, mime, size_bytes, width, height, caption, caption_es, sort, added_at")
        .eq("hidden", false)
        .order("sort")
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KitItem[];
    },
  });
}

// ---------- events the team adds (27 Nov 2026) ----------

export function usePartnerEvents() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["hub", "events", partner?.id],
    enabled: !!partner,
    queryFn: async (): Promise<PartnerEvent[]> => {
      if (DEMO) return (await loadDemo()).events();
      const { data, error } = await portal
        .from("partner_events")
        .select("id, title, title_es, details, details_es, starts_on, ends_on, time_text, place, country, url, audience")
        .eq("hidden", false)
        .order("starts_on");
      if (error) throw error;
      return (data ?? []) as PartnerEvent[];
    },
  });
}

// ---------- the map ----------

export interface MapMember {
  id: string;
  name: string;
  orgType: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  logoPath: string | null;
  entryLogo: string | null;
  acts: number;
  joined: boolean;
  /** "open_link" for people who joined through the open link */
  joinedVia?: string | null;
}

export interface HubStats {
  pledgers: { country: string; people: number }[];
  partners: MapMember[];
  actsLogged: number;
  posts: number;
  listedPartners: number;
  pledgedActs: number;
}

export function useStats() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["stats", partner?.id],
    enabled: !!partner,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<HubStats> => {
      const s = DEMO ? (await loadDemo()).stats() : await rpc<HubStats>("partner_hub_stats");
      return {
        pledgers: s.pledgers ?? [],
        // someone who used the open link shows only once they've opened the link we emailed them
        partners: (s.partners ?? []).filter((p) => !(p.joinedVia === "open_link" && !p.joined)).map((p) => ({ ...p, acts: Number(p.acts) || 0 })),
        actsLogged: Number(s.actsLogged) || 0,
        posts: Number(s.posts) || 0,
        listedPartners: Number(s.listedPartners) || 0,
        pledgedActs: Number(s.pledgedActs) || 0,
      };
    },
  });
}

// ---------- the community ----------

/** A listed partner from the partners sheet: the same list as the website's partners page. */
export interface PartnerEntry {
  id: string;
  category: string | null;
  name: string;
  logo_url: string | null;
  website: string | null;
  role: string | null;
  featured: boolean | null;
  founding: boolean | null;
  sort_order: number | null;
}

export interface CommunityMember {
  key: string;
  /** set for members with a hub account (their posts and profile can be opened) */
  partnerId: string | null;
  name: string;
  kind: Kind;
  orgType: string | null;
  category: string | null;
  logoUrl: string | null;
  website: string | null;
  role: string | null;
  city: string | null;
  country: string | null;
  inHub: boolean;
  acts: number;
  founding: boolean;
}

/**
 * The team's own accounts, never listed to members as partners: the three test members
 * ("TEST Organisation (Kindness Forward team)" and so on) and "Kindness Forward team", the
 * account the team uses to look after the hub (25 Nov 2026).
 */
export const isTeamAccount = (name: string) => /Kindness Forward team/.test(name);

/** The sheet's categories, in the hub's own kinds and types. */
export function entryType(category: string | null): { kind: Kind; orgType: string | null } {
  const c = (category ?? "").toLowerCase();
  if (/corporate|company|business/.test(c)) return { kind: "company", orgType: "company" };
  if (/government|municip/.test(c)) return { kind: "organisation", orgType: "government" };
  if (/education|school/.test(c)) return { kind: "organisation", orgType: "school" };
  if (/faith|spiri/.test(c)) return { kind: "organisation", orgType: "faith" };
  if (/non-?profit|ngo/.test(c)) return { kind: "organisation", orgType: "ngo" };
  if (/media|press/.test(c)) return { kind: "organisation", orgType: "media" };
  return { kind: "organisation", orgType: "other" };
}

/**
 * Everyone in the movement: members with a hub account first, then every listed partner on the
 * website's partners page (public there already), so the community is full from day one.
 */
export function useCommunity() {
  const { partner } = useSession();
  const stats = useStats();
  const entries = useQuery({
    queryKey: ["partner-entries"],
    enabled: !!partner,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<PartnerEntry[]> => {
      if (DEMO) return (await loadDemo()).entries();
      const { data, error } = await portal
        .from("partner_entries")
        .select("id, category, name, logo_url, website, role, featured, founding, sort_order")
        .eq("status", "Approved");
      if (error) throw error;
      return (data ?? []) as PartnerEntry[];
    },
  });
  const members = stats.data?.partners ?? [];
  const signed = useQuery({
    queryKey: ["community-logos", members.map((m) => m.logoPath).join("|")],
    enabled: members.length > 0,
    staleTime: 50 * 60_000,
    queryFn: () => signPaths(members.map((m) => m.logoPath)),
  });
  const data = useMemo((): CommunityMember[] | undefined => {
    if (!stats.data || !entries.data) return undefined;
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const hub = members.filter((m) => !isTeamAccount(m.name));
    const taken = new Set([...hub.map((m) => norm(m.name)), ...hub.map((m) => m.entryLogo).filter(Boolean)]);
    const fromHub: CommunityMember[] = hub.map((m) => {
      const entry = entries.data!.find((e) => (m.entryLogo && e.logo_url === m.entryLogo) || norm(e.name) === norm(m.name));
      return {
        key: m.id,
        partnerId: m.id,
        name: m.name,
        kind: kindOf(m.orgType),
        orgType: m.orgType,
        category: entry?.category ?? null,
        logoUrl: logoUrl(signed.data ?? new Map(), m.logoPath, m.entryLogo),
        website: entry?.website ?? null,
        role: entry?.role ?? null,
        city: m.city,
        country: m.country,
        inHub: m.joined,
        acts: m.acts,
        founding: !!entry?.founding,
      };
    });
    const listed: CommunityMember[] = entries.data
      .filter((e) => !taken.has(norm(e.name)) && !(e.logo_url && taken.has(e.logo_url)))
      .sort((a, b) => Number(!!b.founding) - Number(!!a.founding) || (a.sort_order ?? 9999) - (b.sort_order ?? 9999) || a.name.localeCompare(b.name))
      .map((e) => {
        const t = entryType(e.category);
        return {
          key: `entry:${e.id}`,
          partnerId: null,
          name: e.name,
          kind: t.kind,
          orgType: t.orgType,
          category: e.category,
          logoUrl: e.logo_url,
          website: e.website,
          role: e.role,
          city: null,
          country: null,
          inHub: false,
          acts: 0,
          founding: !!e.founding,
        };
      });
    fromHub.sort((a, b) => Number(b.inHub) - Number(a.inHub) || b.acts - a.acts || a.name.localeCompare(b.name));
    return [...fromHub, ...listed];
  }, [stats.data, entries.data, members, signed.data]);
  return { data, isLoading: stats.isLoading || entries.isLoading, error: stats.error ?? entries.error };
}

export interface RecentPledge {
  created_at: string;
  country: string | null;
  kind: "person" | "organisation";
  org_name: string | null;
  acts: number;
}

/** The newest pledges from anywhere, refreshed every minute, for the map's live line. */
export function useRecentPledges() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["recent-pledges", partner?.id],
    enabled: !!partner,
    refetchInterval: 60_000,
    queryFn: async (): Promise<RecentPledge[]> => (DEMO ? (await loadDemo()).recentPledges() : rpc<RecentPledge[]>("partner_recent_pledges", { _limit: 20 })),
  });
}

// ---------- small helpers ----------

/** "2 hours ago", "3 days ago", or a date. */
export function timeAgo(iso: string, locale: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const min = Math.round(diff / 60_000);
  if (min < 1) return rtf.format(0, "minute");
  if (min < 60) return rtf.format(-min, "minute");
  const hrs = Math.round(min / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  const days = Math.round(hrs / 24);
  if (days < 7) return rtf.format(-days, "day");
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function isNew(iso: string, days = 14) {
  return Date.now() - new Date(iso).getTime() < days * 86_400_000;
}
