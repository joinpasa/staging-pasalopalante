import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Empty, PageHead, PlatformRow, Segmented } from "@/components/bits";
import { useAccounts, useGhlPosts, useHub } from "@/lib/hub";
import { PLATFORMS } from "@/lib/stages";
import { prDay, prTime } from "@/lib/time";
import type { Platform } from "@/lib/types";

const isPlatform = (p: string): p is Platform => p in PLATFORMS;

/** Every post on the schedule and every post that has gone out, across all accounts. */
export default function PostsPage() {
  const { openPost } = useHub();
  const { data: posts = [] } = useGhlPosts();
  const { data: accounts = [] } = useAccounts();
  const [tab, setTab] = useState<"scheduled" | "published">("scheduled");
  const [platform, setPlatform] = useState<Platform | "all">("all");

  const counts = { scheduled: posts.filter((p) => p.status === "scheduled").length, published: posts.filter((p) => p.status === "published").length };
  // a post that has gone out belongs to one platform; one still on the schedule can go to several accounts
  const platformsOf = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.id, a.platform]));
    return (p: { platform: string; accountIds: string[] }): Platform[] => {
      const fromAccounts = [...new Set(p.accountIds.map((id) => byId.get(id)).filter(Boolean))] as Platform[];
      return fromAccounts.length ? fromAccounts : isPlatform(p.platform) ? [p.platform] : [];
    };
  }, [accounts]);
  const platforms = useMemo(() => [...new Set(posts.flatMap(platformsOf))], [posts, platformsOf]);
  const list = useMemo(
    () =>
      posts
        .filter((p) => p.status === tab && (platform === "all" || platformsOf(p).includes(platform)))
        // what goes out next comes first; what went out last comes first
        .sort((a, b) => (tab === "scheduled" ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at))),
    [posts, tab, platform, platformsOf],
  );

  return (
    <>
      <PageHead title="Posts" sub="Everything on the schedule and everything that has gone out. Open a post to change its time, fix its caption or take it off the schedule, without leaving the hub." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={
            [
              ["scheduled", `Still to go out (${counts.scheduled})`],
              ["published", `Gone out (${counts.published})`],
            ] as const
          }
        />
        <label className="flex items-center gap-2 text-[13px] text-ink-muted">
          Platform
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform | "all")} className="field h-9 w-auto py-0 pr-8 text-[13.5px]">
            <option value="all">All platforms</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {PLATFORMS[p].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.length === 0 ? (
        <Empty title={tab === "scheduled" ? "Nothing is waiting to go out" : "Nothing has gone out yet"} body={tab === "scheduled" ? "Approved cards land here once they are scheduled." : undefined} />
      ) : (
        <ul className="border-t border-line">
          {list.map((p) => {
            const m = p.media[0];
            const to = accounts.filter((a) => p.accountIds.includes(a.id));
            return (
              <li key={p.id} className="border-b border-line">
                <button type="button" onClick={() => openPost(p.id)} className="group flex w-full items-center gap-4 py-3 text-left transition hover:bg-paper">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
                    {m && (m.type.startsWith("video/") ? p.thumbnail ? <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : <video src={`${m.url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{p.caption ? p.caption.split("\n")[0] : <span className="font-medium text-ink-faint">No caption</span>}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                      <PlatformRow accountIds={p.accountIds} accounts={accounts} size={15} />
                      <span className="truncate">{to.map((a) => a.name).join(", ")}</span>
                      <span className="shrink-0 capitalize text-ink-faint">· {p.type}</span>
                    </span>
                  </span>
                  <span className="w-[112px] shrink-0 text-right text-[13px] tabular-nums">
                    <span className="block font-semibold">{prDay(p.at)}</span>
                    <span className="block text-ink-muted">{prTime(p.at)}</span>
                  </span>
                  <ChevronRight size={16} className="mr-1 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-navy" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
