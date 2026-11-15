import type { Format, Platform, Stage } from "./types";

export interface StageMeta {
  id: Stage;
  label: string;
  /** one line on what this stage means */
  hint: string;
  /** the stage's colour, as a tailwind background class */
  bar: string;
  /** the same colour as a hex value, for charts */
  hex: string;
}

/** The pipeline, left to right. Each stage keeps one colour everywhere in the hub. */
export const STAGES: StageMeta[] = [
  { id: "idea", label: "Idea", hint: "Suggested, or from the weekly brief", bar: "bg-ink-faint", hex: "#8B91A1" },
  { id: "planning", label: "Planning", hint: "Claimed. Format, date and accounts chosen", bar: "bg-sky", hex: "#00a3e0" },
  { id: "creating", label: "Creating", hint: "Being made", bar: "bg-sun", hex: "#fdb813" },
  { id: "review", label: "Review", hint: "Waiting for a second pair of eyes", bar: "bg-orange", hex: "#f37023" },
  { id: "approved", label: "Approved", hint: "Signed off, ready to schedule", bar: "bg-rose", hex: "#d81b60" },
  { id: "scheduled", label: "Scheduled", hint: "Queued to go out", bar: "bg-navy", hex: "#0e234b" },
  { id: "posted", label: "Posted", hint: "Live", bar: "bg-[#2f9e6e]", hex: "#2f9e6e" },
];

export const stageMeta = (id: Stage): StageMeta => STAGES.find((s) => s.id === id) ?? STAGES[0];
export const stageIndex = (id: Stage): number => STAGES.findIndex((s) => s.id === id);

export const FORMATS: { id: Format; label: string; video: boolean }[] = [
  { id: "reel", label: "Reel", video: true },
  { id: "story", label: "Story", video: true },
  { id: "carousel", label: "Carousel", video: false },
  { id: "image", label: "Image", video: false },
  { id: "video", label: "Video", video: true },
  { id: "email", label: "Email", video: false },
];
export const formatLabel = (f: Format): string => FORMATS.find((x) => x.id === f)?.label ?? f;

export const PLATFORMS: Record<Platform, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877F2" },
  instagram: { label: "Instagram", color: "#D62976" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  tiktok: { label: "TikTok", color: "#111111" },
  youtube: { label: "YouTube", color: "#FF0000" },
  pinterest: { label: "Pinterest", color: "#BD081C" },
};
