// The video gallery's shared helpers: what a link is, how to show it, and what each label means.

import type { Video, VideoGroup, VideoRights } from "./types";

/** What kind of link this is, from its address. */
export function videoKind(url: string): Video["kind"] {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  if (u.includes("instagram.com")) return "instagram";
  if (/facebook\.com|fb\.watch/.test(u)) return "facebook";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("drive.google.com")) return "drive";
  if (/\.(mp4|mov|m4v|webm)(\?|#|$)/.test(u)) return "file";
  return "link";
}

/** The YouTube video id in a watch, short, live or youtu.be link. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** A still to show for the video: its own poster, or YouTube's thumbnail. */
export function posterFor(v: Pick<Video, "poster" | "kind" | "url">): string | undefined {
  if (v.poster) return v.poster;
  if (v.kind === "youtube") {
    const id = youtubeId(v.url);
    if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  return undefined;
}

/** 75 → "1:15" */
export function clock(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return "";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const GROUPS: Record<VideoGroup, { label: string; plural: string; about: string }> = {
  ours: { label: "Ours", plural: "Our videos", about: "Made by the team. Free to use, recut and post." },
  partner: { label: "Partner", plural: "From partners", about: "Sent by a partner or ambassador, or posted by them." },
  press: { label: "Press", plural: "Press and TV", about: "News and TV coverage of the movement." },
  event: { label: "Event", plural: "Events", about: "Recordings of broadcasts and events." },
  reference: { label: "Reference", plural: "For reference", about: "Other organisations' videos worth knowing about." },
};

export const GROUP_ORDER: VideoGroup[] = ["ours", "partner", "press", "event", "reference"];

export const RIGHTS: Record<VideoRights, { label: string; about: string; tone: string }> = {
  ours: { label: "Free to use", about: "Ours. Use it, cut it, post it.", tone: "bg-sky-soft text-sky-ink" },
  ask: { label: "Ask first", about: "Someone else's. Ask them before using any part of it, and keep their yes.", tone: "bg-orange-soft text-orange-ink" },
  share: { label: "Share only", about: "Share or link to their post. Do not cut it into our own videos.", tone: "bg-paper text-ink-muted" },
  no: { label: "Keep out", about: "Not for our posts or TV work.", tone: "bg-rose-soft text-rose-ink" },
};

export const KIND_LABEL: Record<Video["kind"], string> = {
  file: "Plays here",
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  drive: "Shared drive",
  link: "Web page",
};
