import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, Lock, MessageCircle, MoreHorizontal, Send, Sparkles, Trash2 } from "lucide-react";
import { useHubCopy } from "@/lib/hubCopy";
import { useSession } from "@/lib/session";
import { timeAgo, toggleHeart, useAddComment, useComments, useDeleteComment, useDeletePost, type Post } from "@/lib/hub";
import { kindLabel, KIND_COLOR, KIND_TINT } from "@/lib/kinds";
import { countryLabel } from "@/lib/geo";
import Avatar from "./Avatar";

/** One post, laid out like a social feed: who, the picture, the words, hearts and comments. */
export default function PostCard({ post, compact = false }: { post: Post; compact?: boolean }) {
  const { h, lang, locale } = useHubCopy();
  const { staff } = useSession();
  const qc = useQueryClient();
  const [hearted, setHearted] = useState(post.hearted);
  const [hearts, setHearts] = useState(post.hearts);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const del = useDeletePost();
  const place = [post.city, post.country ? countryLabel(post.country, lang) : null].filter(Boolean).join(", ");
  const long = post.body.length > 220;

  async function heart() {
    const next = !hearted;
    setHearted(next);
    setHearts((n) => n + (next ? 1 : -1));
    try {
      const r = await toggleHeart(post.id, staff?.id);
      setHearted(r.hearted);
      setHearts(r.hearts);
    } catch {
      setHearted(!next);
      setHearts((n) => n + (next ? -1 : 1));
    }
  }

  return (
    <article className="border-b-[1.5px] border-hair pb-5 pt-4">
      <header className="flex items-center gap-3">
        <Avatar name={post.partnerName} url={post.logoUrl} kind={post.kind} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-[15px] font-extrabold text-navy">{post.partnerName}</span>
            <span className="chip" style={{ background: KIND_TINT[post.kind], color: post.kind === "ambassador" ? "#6B4A00" : KIND_COLOR[post.kind] }}>
              {kindLabel(post.kind, lang)}
            </span>
          </div>
          <div className="truncate text-[13px] font-medium text-ink-faint">
            {[post.staffName && post.staffName !== post.partnerName ? post.staffName : null, place, timeAgo(post.createdAt, locale)].filter(Boolean).join(" · ")}
          </div>
        </div>
        {post.mine && (
          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} className="flex h-9 w-9 items-center justify-center text-ink-faint hover:bg-tint-sky" aria-label="More">
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
            {menu && (
              <div className="absolute end-0 top-10 z-10 w-48 border-[1.5px] border-hair bg-white p-1 shadow-card">
                {confirming ? (
                  <div className="flex flex-col gap-2 p-2">
                    <span className="text-sm font-bold">{h.deletePostQ}</span>
                    <div className="flex gap-2">
                      <button type="button" className="btn h-9 flex-1 bg-rose text-white" onClick={() => del.mutate(post.id)}>
                        {h.delete}
                      </button>
                      <button type="button" className="btn h-9 flex-1 border-[1.5px] border-hair" onClick={() => (setConfirming(false), setMenu(false))}>
                        {h.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirming(true)} className="flex h-10 w-full items-center gap-2 px-3 text-sm font-semibold text-rose-ink hover:bg-rose-soft">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {h.delete}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {(post.usedAt || post.audience === "team" || post.postKind === "testimonial") && (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.usedAt && (
            <a
              href={post.usedUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="chip bg-tint-gold text-[#6B4A00] no-underline"
              onClick={(e) => !post.usedUrl && e.preventDefault()}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {h.sharedOnSocials}
            </a>
          )}
          {post.audience === "team" && (
            <span className="chip bg-tint-sky text-sky-ink">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              {h.onlyTeam}
            </span>
          )}
          {post.postKind === "testimonial" && <span className="chip bg-tint-pink text-rose-ink">{h.testimonial}</span>}
        </div>
      )}

      {post.body && (
        <p className={`m-0 mt-3 whitespace-pre-line text-[15.5px] font-medium leading-relaxed text-navy ${post.postKind === "testimonial" ? "border-s-4 border-magenta ps-3" : ""}`}>
          {long && !expanded ? `${post.body.slice(0, 200).trimEnd()}… ` : post.body}
          {long && (
            <button type="button" onClick={() => setExpanded((e) => !e)} className="ms-1 text-sm font-bold text-sky-deep">
              {expanded ? h.showLess : h.readMore}
            </button>
          )}
        </p>
      )}

      {post.media.length > 0 && <Media items={post.media} compact={compact} />}

      <div className="mt-3 flex items-center gap-5">
        <button type="button" onClick={heart} className="flex items-center gap-1.5 text-sm font-bold text-ink2" aria-pressed={hearted}>
          <Heart className={`h-[22px] w-[22px] transition ${hearted ? "scale-110 fill-magenta text-magenta" : ""}`} aria-hidden="true" />
          {hearts > 0 && hearts}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-sm font-bold text-ink2" aria-expanded={open}>
          <MessageCircle className="h-[22px] w-[22px]" aria-hidden="true" />
          {post.comments > 0 && post.comments}
        </button>
      </div>

      {open && <Comments postId={post.id} onChange={() => qc.invalidateQueries({ queryKey: ["feed"] })} />}
    </article>
  );
}

function Media({ items, compact }: { items: Post["media"]; compact: boolean }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const one = items.length === 1;
  return (
    <div className="relative mt-3">
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className={`flex snap-x snap-mandatory overflow-x-auto ${one ? "" : "[scrollbar-width:none]"}`}
      >
        {items.map((m) => (
          <div key={m.path} className="w-full shrink-0 snap-center bg-tint-sky">
            {m.type === "video" ? (
              <video src={m.url} controls playsInline preload="metadata" className={`w-full bg-tint-sky ${compact ? "max-h-[260px]" : "max-h-[min(480px,62vh)]"}`} />
            ) : (
              <img src={m.url} alt="" loading="lazy" className={`w-full object-cover ${compact ? "aspect-[16/10]" : "max-h-[min(480px,62vh)]"}`} />
            )}
          </div>
        ))}
      </div>
      {!one && (
        <>
          <span className="absolute end-2 top-2 bg-white/90 px-2 py-0.5 text-xs font-extrabold text-navy">
            {index + 1}/{items.length}
          </span>
          <div className="mt-2 flex justify-center gap-1.5">
            {items.map((m, i) => (
              <span key={m.path} className={`h-1.5 w-1.5 ${i === index ? "bg-sky" : "bg-hair"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Comments({ postId, onChange }: { postId: string; onChange: () => void }) {
  const { h, locale } = useHubCopy();
  const { data: comments, isLoading } = useComments(postId, true);
  const add = useAddComment(postId);
  const del = useDeleteComment(postId);
  const [text, setText] = useState("");

  async function send() {
    const body = text.trim();
    if (!body) return;
    await add.mutateAsync(body);
    setText("");
    onChange();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 bg-[#F7FBFD] p-3">
      {isLoading && <span className="text-sm text-ink-faint">…</span>}
      {(comments ?? []).map((c) => (
        <div key={c.id} className="flex gap-2.5">
          <span className={`mt-0.5 h-7 w-7 shrink-0 ${c.team ? "bg-bar" : "bg-tint-sky"}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px]">
              <b className="font-extrabold text-navy">{c.author}</b>
              <span className="text-ink-faint"> · {c.team ? h.team : c.partner_name} · {timeAgo(c.created_at, locale)}</span>
            </div>
            <p className="m-0 text-[14.5px] font-medium text-navy [overflow-wrap:anywhere]">{c.body}</p>
            {c.mine && (
              <button type="button" onClick={() => del.mutate(c.id, { onSuccess: onChange })} className="text-xs font-bold text-ink-faint hover:text-rose-ink">
                {h.delete}
              </button>
            )}
          </div>
        </div>
      ))}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          id={`comment-${postId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={800}
          placeholder={h.writeComment}
          className="h-10 min-w-0 flex-1 border-[1.5px] border-hair bg-white px-3 text-[14.5px] outline-none focus:border-sky"
        />
        <button type="submit" disabled={!text.trim() || add.isPending} className="flex h-10 w-10 items-center justify-center bg-sky text-white disabled:opacity-50" aria-label={h.send}>
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
