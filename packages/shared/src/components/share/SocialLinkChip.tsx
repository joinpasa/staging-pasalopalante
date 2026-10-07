import { Facebook, Instagram, Link2, Twitter, X, Youtube } from "lucide-react";
import type { DetectedSocialLink, SocialPlatform } from "@shared/lib/socialLinks";

// TikTok has no brand icon in lucide-react — Link2 plus the text label
// ("TikTok link detected") carries the identification instead. Exported so
// the Wall (which shows the same platform icon on a "view original post"
// card) doesn't need its own copy of this mapping.
export const SOCIAL_LINK_ICONS: Record<SocialPlatform, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Link2,
  x: Twitter,
  youtube: Youtube,
};

interface Props {
  link: DetectedSocialLink;
  detectedLabel: string;
  removeLabel: string;
  onRemove: () => void;
}

export default function SocialLinkChip({ link, detectedLabel, removeLabel, onRemove }: Props) {
  const Icon = SOCIAL_LINK_ICONS[link.platform];
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5">
      <Icon size={18} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{detectedLabel}</p>
        <p className="truncate text-xs text-muted-foreground">{link.url}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X size={16} />
      </button>
    </div>
  );
}
