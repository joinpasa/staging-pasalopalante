import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck, Trash2, X } from "lucide-react";
import { PlatformDot, PlatformRow } from "./bits";
import { FindingList } from "./ItemDrawer";
import { checkCaption } from "@/lib/checks";
import { useAccounts, useAct, useGhlPosts, useHub, useMe } from "@/lib/hub";
import { PLATFORMS } from "@/lib/stages";
import { isoToPrInput, localDateTime, prDateTime, prInputToIso } from "@/lib/time";
import type { GhlPost, Platform } from "@/lib/types";

/** One post that is already on the schedule or already live: look at it, change it, or take it off. */
export default function PostPanel() {
  const { postId, openPost } = useHub();
  const { data: posts = [] } = useGhlPosts();
  const post = posts.find((p) => p.id === postId);

  return (
    <Dialog.Root open={!!post} onOpenChange={(v) => !v && openPost(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()} className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-24px)] max-w-[820px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift outline-none data-[state=open]:animate-fade-in">
          {post && <Body key={post.id} post={post} onClose={() => openPost(null)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body({ post, onClose }: { post: GhlPost; onClose: () => void }) {
  const act = useAct();
  const { store } = useHub();
  const { data: accounts = [] } = useAccounts();
  const { data: me } = useMe();
  const [caption, setCaption] = useState(post.caption);
  const [at, setAt] = useState(post.at);
  const [removing, setRemoving] = useState(false);
  useEffect(() => {
    setCaption(post.caption);
    setAt(post.at);
  }, [post.caption, post.at]);

  const scheduled = post.status === "scheduled";
  const canEdit = scheduled && me?.role !== "member";
  const changed = caption !== post.caption || at !== post.at;
  const findings = checkCaption(caption, { needsHashtag: post.type !== "story" });
  const goesTo = accounts.filter((a) => post.accountIds.includes(a.id));
  const media = post.media[0];
  const onPlatforms = [...new Set(goesTo.map((a) => a.platform))] as Platform[];
  const platform = onPlatforms.length === 1 ? onPlatforms[0] : undefined;

  const save = async () => {
    const res = await act((s) => s.updatePost(post.id, { ...(caption !== post.caption && { caption }), ...(at !== post.at && { at }) }), store.mode === "demo" ? "Saved in the preview. On the live hub this changes the schedule." : "Saved");
    if (res) onClose();
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <PlatformRow accountIds={post.accountIds} accounts={accounts} size={22} />
        <Dialog.Title className="min-w-0 flex-1 truncate text-[15px] font-bold">
          {platform ? `${PLATFORMS[platform].label} ${post.type}` : `${post.type.slice(0, 1).toUpperCase()}${post.type.slice(1)} for ${goesTo.length} accounts`}
          <span className="ml-2 text-[13px] font-medium text-ink-muted">{scheduled ? `Scheduled for ${prDateTime(post.at)}, Puerto Rico time` : `Went out ${prDateTime(post.at)}, Puerto Rico time`}</span>
        </Dialog.Title>
        <Dialog.Close className="btn-quiet -mr-2 h-9 w-9 px-0" aria-label="Close">
          <X size={18} />
        </Dialog.Close>
      </header>

      <div className="grid flex-1 gap-6 overflow-y-auto p-5 sm:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <div className="overflow-hidden rounded-xl border border-line bg-paper">
            {media ? (
              media.type.startsWith("video/") ? (
                <video src={media.url} poster={post.thumbnail ?? undefined} controls playsInline preload="metadata" className="max-h-[380px] w-full object-contain" />
              ) : (
                <img src={media.url} alt="" className="max-h-[380px] w-full object-contain" />
              )
            ) : (
              <p className="px-4 py-10 text-center text-[13px] text-ink-faint">No picture or video</p>
            )}
          </div>
          {post.media.length > 1 && <p className="mt-2 text-[12.5px] text-ink-muted">{post.media.length} slides in this post.</p>}
          <ul className="mt-3 space-y-1">
            {goesTo.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-[13px] font-medium">
                <PlatformDot platform={a.platform} size={15} /> <span className="truncate">{a.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <label className="label" htmlFor="post-caption">
              Caption
            </label>
            <textarea id="post-caption" value={caption} onChange={(e) => setCaption(e.target.value)} disabled={!canEdit} rows={9} placeholder={post.type === "story" ? "Stories go out without a caption." : ""} className="field resize-y leading-relaxed disabled:bg-paper" />
            {findings.length > 0 && (
              <div className="mt-2">
                <FindingList findings={findings} compact />
              </div>
            )}
          </div>
          <div>
            <label className="label" htmlFor="post-at">
              {scheduled ? "Goes out" : "Went out"} <span className="font-medium text-ink-faint">(Puerto Rico time)</span>
            </label>
            <input id="post-at" type="datetime-local" value={isoToPrInput(at)} onChange={(e) => setAt(prInputToIso(e.target.value) ?? post.at)} disabled={!canEdit} className="field disabled:bg-paper" />
            <p className="mt-1.5 text-[12.5px] text-ink-muted">{localDateTime(at)} on your clock</p>
          </div>
          {!scheduled && (
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
              <CircleCheck size={15} className="mt-0.5 shrink-0 text-[#2f9e6e]" /> This post is live, so it can't be changed from here. To edit or remove it, do that on {platform ? PLATFORMS[platform].label : "the platform"} itself.
            </p>
          )}
          {scheduled && !canEdit && <p className="text-[13px] text-ink-muted">Only an approver can change a post that is already on the schedule.</p>}
        </div>
      </div>

      {canEdit && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          {removing ? (
            <>
              <p className="mr-auto text-[13.5px] font-medium">Take this post off the schedule? It won't go out.</p>
              <button type="button" className="btn-quiet" onClick={() => setRemoving(false)}>
                Keep it
              </button>
              <button
                type="button"
                className="btn bg-rose text-white hover:bg-[#c01655]"
                onClick={async () => {
                  await act((s) => s.removePost(post.id), store.mode === "demo" ? "Removed in the preview. Nothing was changed in HighLevel." : "Taken off the schedule");
                  onClose();
                }}
              >
                Take it off
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-quiet px-2.5 text-ink-faint hover:bg-rose-soft hover:text-rose-ink" onClick={() => setRemoving(true)}>
                <Trash2 size={15} /> Take off the schedule
              </button>
              <button type="button" className="btn-primary ml-auto" disabled={!changed} onClick={save}>
                Save changes
              </button>
            </>
          )}
        </footer>
      )}
    </>
  );
}
