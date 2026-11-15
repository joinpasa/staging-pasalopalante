import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAccounts } from "@/lib/hub";
import { PLEDGE_PAGE, slug, tagged } from "@/lib/links";
import { PLATFORMS } from "@/lib/stages";
import type { Item, Platform } from "@/lib/types";

/** The pledge link for each platform a card goes to, tagged so Results can count the pledges it brings. */
export default function TrackedLinks({ item }: { item: Item }) {
  const { data: accounts = [] } = useAccounts();
  const chosen = accounts.filter((a) => item.accountIds.includes(a.id));
  const platforms = [...new Set(chosen.map((a) => a.platform))] as Platform[];
  // Pásalo Pa'lante's accounts send people to the Spanish site
  const spanishOnly = chosen.length > 0 && chosen.every((a) => /pasalo|joinpasa/i.test(a.name));
  const campaign = item.publishAt ? `week-${item.publishAt.slice(0, 10)}` : undefined;
  const content = slug(item.title || "post");
  const link = (p: Platform) => tagged(spanishOnly ? PLEDGE_PAGE.es : PLEDGE_PAGE.en, { source: p, medium: item.format === "story" ? "story" : "social", campaign, content });
  if (!platforms.length) return null;

  const copy = (url: string) => navigator.clipboard.writeText(url).then(() => toast.success("Tracked link copied"), () => toast(url));

  return (
    <section className="border-t border-line pt-5">
      <h3 className="section-title mb-1 flex items-center gap-1.5">
        <Link2 size={14} /> Tracked pledge links
      </h3>
      <p className="mb-2.5 text-[12.5px] leading-relaxed text-ink-muted">Use these wherever a link can go (Facebook, LinkedIn, a story's link sticker), so pledges from this post are counted in Results. Instagram captions cannot hold links; the bio link has its own.</p>
      <ul className="space-y-1.5">
        {platforms.map((p) => (
          <li key={p}>
            <button type="button" onClick={() => void copy(link(p))} className="flex w-full items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-left text-[12.5px] hover:border-navy/30" title={link(p)}>
              <span className="w-[72px] shrink-0 font-semibold">{PLATFORMS[p]?.label ?? p}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{link(p).replace(/^https:\/\//, "")}</span>
              <Copy size={13} className="shrink-0 text-ink-faint" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
