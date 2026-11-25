import { useMemo, useState } from "react";
import { BookmarkPlus, Check, Copy, Download, Eye, EyeOff, ExternalLink, Lock, Megaphone, MessageCircle, Plus, Send, Sparkles, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { cx, Empty, PageHead, Segmented } from "@/components/bits";
import { HUB_LIVE } from "@/lib/client";
import {
  kindOf,
  KIND_COLOR,
  KIND_LABEL,
  kitPublicUrl,
  PARTNERS_HUB_URL,
  useKitActions,
  useKitList,
  useMemberActions,
  useMembers,
  usePHComments,
  usePHPosts,
  usePledgeWaiting,
  usePostActions,
  useSaveUpdate,
  useUpdatesList,
  type MemberKind,
  type PHKitItem,
  type PHMember,
  type PHPost,
  type PHUpdate,
  type PHUpdateItem,
} from "@/lib/partnersHub";

type Tab = "posts" | "update" | "kit" | "members";

const copy = async (text: string, done: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast(text);
  }
};

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function KindChip({ orgType }: { orgType: string | null }) {
  const k = kindOf(orgType);
  return (
    <span className="inline-flex h-[20px] items-center rounded px-1.5 text-[11.5px] font-bold" style={{ background: `${KIND_COLOR[k]}1a`, color: KIND_COLOR[k] }}>
      {KIND_LABEL[k]}
    </span>
  );
}

/** The team's side of the Partners Hub: what members share, the weekly update, the kit and the members. */
export default function PartnersHubPage() {
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "update" || t === "kit" || t === "members" ? t : "posts";
  });

  return (
    <>
      <PageHead
        title="Partners Hub"
        sub="Where organisations, companies and ambassadors get their kit and weekly update, post their kindness and send us stories. Everything here shows up for them at partners.passkindnessforward.com."
        actions={
          <a href={PARTNERS_HUB_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Open the Partners Hub <ExternalLink size={14} />
          </a>
        }
      />
      {!HUB_LIVE ? (
        <Empty title="This page works in the live hub" body="Sign in at pasalopalante.com/hub to see what members share, write the weekly update and manage the kit." />
      ) : (
        <>
          <div className="mb-6">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                ["posts", "Shared with us"],
                ["update", "Weekly update"],
                ["kit", "Kit"],
                ["members", "Members"],
              ]}
            />
          </div>
          {tab === "posts" && <Posts />}
          {tab === "update" && <Updates />}
          {tab === "kit" && <Kit />}
          {tab === "members" && <Members />}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- posts

function Posts() {
  const [audience, setAudience] = useState<"all" | "team" | "community">("team");
  const { data: posts, isLoading } = usePHPosts(audience === "all" ? null : audience);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={audience}
          onChange={setAudience}
          options={[
            ["team", "Sent to us"],
            ["community", "Posted for members"],
            ["all", "Everything"],
          ]}
        />
        <span className="text-[13px] text-ink-muted">Every post carries the consent the member ticked. Use this copies it into the story bank.</span>
      </div>
      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-paper" />}
      {!isLoading && !posts?.length && <Empty title="Nothing here yet" body="Stories and posts from members land here as soon as they send them." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {(posts ?? []).map((p) => (
          <PostRow key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function PostRow({ post }: { post: PHPost }) {
  const act = usePostActions();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [sharing, setSharing] = useState(false);
  const [url, setUrl] = useState("");
  const { data: comments } = usePHComments(replying ? post.id : null);
  const hidden = !!post.hidden_at;
  return (
    <article className={cx("card flex flex-col gap-3 p-4", hidden && "opacity-60")}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <b className="truncate text-[15px]">{post.partner_name}</b>
            <KindChip orgType={post.partner_org_type} />
            {post.audience === "team" ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-muted">
                <Lock size={12} /> Sent to us
              </span>
            ) : (
              <span className="text-[12px] font-semibold text-ink-muted">Posted for members</span>
            )}
          </div>
          <p className="text-[12.5px] text-ink-muted">
            {[post.staff_name, [post.partner_city, post.partner_country].filter(Boolean).join(", "), when(post.created_at)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 text-[12px] font-semibold text-ink-muted">
          ♥ {post.hearts} · {post.comments} comments
        </span>
      </header>
      {post.body && <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{post.body}</p>}
      {post.media.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {post.media.map((m) =>
            m.type === "video" ? (
              <video key={m.path} src={m.url} controls preload="metadata" className="aspect-square w-full rounded bg-paper object-cover" />
            ) : (
              <a key={m.path} href={m.url} target="_blank" rel="noopener noreferrer">
                <img src={m.url} alt="" className="aspect-square w-full rounded object-cover" />
              </a>
            ),
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 text-[12px]">
        <span className={cx("rounded px-1.5 py-0.5 font-semibold", post.consent_share ? "bg-sky-soft text-sky-ink" : "bg-rose-soft text-rose-ink")}>
          {post.consent_share ? "OK to share" : "No share consent"}
        </span>
        {post.media.length > 0 && (
          <span className={cx("rounded px-1.5 py-0.5 font-semibold", post.consent_people ? "bg-sky-soft text-sky-ink" : "bg-rose-soft text-rose-ink")}>
            {post.consent_people ? "People in it agreed" : "People's consent missing"}
          </span>
        )}
        {post.shows_minors && <span className="rounded bg-sun-soft px-1.5 py-0.5 font-bold text-sun-ink">Shows someone under 18: guardian's yes needed on file before we post</span>}
        {post.used_at && <span className="rounded bg-sun-soft px-1.5 py-0.5 font-semibold text-sun-ink">Shared on our socials {post.used_url ? "· link added" : ""}</span>}
        {post.story_id && <span className="rounded bg-paper px-1.5 py-0.5 font-semibold text-ink-muted">In the story bank</span>}
        {hidden && <span className="rounded bg-rose-soft px-1.5 py-0.5 font-semibold text-rose-ink">Hidden{post.hidden_note ? `: ${post.hidden_note}` : ""}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!post.story_id && (
          <button type="button" className="btn-ghost" disabled={act.toStoryBank.isPending} onClick={() => act.toStoryBank.mutate(post, { onSuccess: () => toast.success("Added to the story bank"), onError: (e) => toast.error((e as Error).message) })}>
            <BookmarkPlus size={15} /> Use this
          </button>
        )}
        {!post.used_at && (
          <button type="button" className="btn-ghost" onClick={() => setSharing((s) => !s)}>
            <Sparkles size={15} /> We shared it
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => setReplying((r) => !r)}>
          <MessageCircle size={15} /> Reply
        </button>
        {hidden ? (
          <button type="button" className="btn-quiet" onClick={() => act.unhide.mutate(post.id)}>
            <Eye size={15} /> Show again
          </button>
        ) : (
          <button
            type="button"
            className="btn-quiet"
            onClick={() => {
              const note = window.prompt("Why hide it? (the member doesn't see this note)") ?? "";
              act.hide.mutate({ id: post.id, note });
            }}
          >
            <EyeOff size={15} /> Hide
          </button>
        )}
      </div>
      {sharing && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act.markShared.mutate({ id: post.id, url }, { onSuccess: () => (setSharing(false), toast.success("Marked as shared. The member sees it on their post.")) });
          }}
        >
          <input id={`share-url-${post.id}`} className="field flex-1" placeholder="Link to our post (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit" className="btn-primary">
            <Check size={15} /> Save
          </button>
        </form>
      )}
      {replying && (
        <div className="flex flex-col gap-2 rounded-lg bg-paper p-3">
          {(comments ?? []).map((c) => (
            <p key={c.id} className="text-[13.5px]">
              <b>{c.author}</b> {c.team && <span className="text-[11px] font-bold text-sky-ink">Kindness Forward</span>} {c.body}
            </p>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reply.trim()) return;
              act.reply.mutate({ id: post.id, body: reply }, { onSuccess: () => setReply(""), onError: (err) => toast.error((err as Error).message) });
            }}
          >
            <input id={`reply-${post.id}`} className="field flex-1" placeholder="Reply as Kindness Forward…" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={800} />
            <button type="submit" className="btn-primary" aria-label="Send">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- weekly update

const blankUpdate = (): PHUpdate => {
  const d = new Date();
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return {
    week_start: `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`,
    title: "",
    title_es: "",
    intro: "",
    intro_es: "",
    items: [
      { kind: "kit", text: "", textEs: "" },
      { kind: "ask", text: "", textEs: "" },
      { kind: "news", text: "", textEs: "" },
    ],
    spotlight_partner_id: null,
    spotlight_text: "",
    spotlight_text_es: "",
  };
};

const ITEM_LABEL: Record<PHUpdateItem["kind"], string> = { kit: "New in the kit", ask: "This week's ask", news: "News", moment: "Coming up" };

function Updates() {
  const { data: list } = useUpdatesList();
  const { data: members } = useMembers();
  const save = useSaveUpdate();
  const [draft, setDraft] = useState<PHUpdate | null>(null);

  if (draft) {
    const set = (patch: Partial<PHUpdate>) => setDraft({ ...draft, ...patch });
    const setItem = (i: number, patch: Partial<PHUpdateItem>) => set({ items: draft.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
    const run = (publish: boolean | null) =>
      save.mutate(
        { update: draft, publish },
        {
          onSuccess: (u) => {
            toast.success(publish ? "Published. Members see it on their Home now." : publish === false ? "Taken down" : "Saved");
            setDraft(publish === null ? u : null);
          },
          onError: (e) => toast.error((e as Error).message),
        },
      );
    return (
      <div className="flex max-w-[860px] flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr_1fr]">
          <label className="flex flex-col gap-1">
            <span className="label">Week of (Monday)</span>
            <input id="u-week" type="date" className="field" value={draft.week_start} onChange={(e) => set({ week_start: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Title</span>
            <input id="u-title" className="field" value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Gratitude week" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Title in Spanish</span>
            <input id="u-title-es" className="field" value={draft.title_es} onChange={(e) => set({ title_es: e.target.value })} placeholder="Semana de la gratitud" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="label">A line to start (shown under Read more)</span>
            <textarea id="u-intro" className="field min-h-[70px]" value={draft.intro} onChange={(e) => set({ intro: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">In Spanish</span>
            <textarea id="u-intro-es" className="field min-h-[70px]" value={draft.intro_es} onChange={(e) => set({ intro_es: e.target.value })} />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <span className="label">Lines (members see the first three straight away; keep each to one sentence)</span>
          {draft.items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-line p-2.5 sm:grid-cols-[150px_1fr_1fr_auto]">
              <select id={`u-kind-${i}`} className="field" value={it.kind} onChange={(e) => setItem(i, { kind: e.target.value as PHUpdateItem["kind"] })}>
                {(Object.keys(ITEM_LABEL) as PHUpdateItem["kind"][]).map((k) => (
                  <option key={k} value={k}>
                    {ITEM_LABEL[k]}
                  </option>
                ))}
              </select>
              <input id={`u-text-${i}`} className="field" placeholder="English" value={it.text} onChange={(e) => setItem(i, { text: e.target.value })} />
              <input id={`u-text-es-${i}`} className="field" placeholder="Español" value={it.textEs ?? ""} onChange={(e) => setItem(i, { textEs: e.target.value })} />
              <button type="button" className="btn-quiet" onClick={() => set({ items: draft.items.filter((_, j) => j !== i) })} aria-label="Remove line">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {draft.items.length < 8 && (
            <button type="button" className="btn-ghost w-fit" onClick={() => set({ items: [...draft.items, { kind: "news", text: "", textEs: "" }] })}>
              <Plus size={15} /> Add a line
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
          <label className="flex flex-col gap-1">
            <span className="label">Member spotlight (optional)</span>
            <select id="u-spot" className="field" value={draft.spotlight_partner_id ?? ""} onChange={(e) => set({ spotlight_partner_id: e.target.value || null })}>
              <option value="">No spotlight this week</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Why them</span>
            <input id="u-spot-text" className="field" value={draft.spotlight_text ?? ""} onChange={(e) => set({ spotlight_text: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">In Spanish</span>
            <input id="u-spot-text-es" className="field" value={draft.spotlight_text_es ?? ""} onChange={(e) => set({ spotlight_text_es: e.target.value })} />
          </label>
        </div>
        <p className="text-[13px] text-ink-muted">House style: sentence case, no exclamation marks, "more than 1.1 million pledges, recognised by Official World Record", countries are invited.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={save.isPending || !draft.title.trim()} onClick={() => run(draft.published_at ? null : true)}>
            <Megaphone size={15} /> {draft.published_at ? "Save changes" : "Publish to members"}
          </button>
          {!draft.published_at && (
            <button type="button" className="btn-ghost" disabled={save.isPending} onClick={() => run(null)}>
              Save draft
            </button>
          )}
          {draft.published_at && (
            <button type="button" className="btn-quiet" onClick={() => run(false)}>
              Take it down
            </button>
          )}
          <button type="button" className="btn-quiet" onClick={() => setDraft(null)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className="btn-primary w-fit" onClick={() => setDraft(blankUpdate())}>
        <Plus size={15} /> Write this week's update
      </button>
      {!list?.length && <Empty title="No updates yet" body="Each Monday members see one short update on their Home: what's new in the kit, one ask and some news." />}
      {(list ?? []).map((u) => (
        <button key={u.id} type="button" onClick={() => setDraft({ ...u, items: u.items ?? [] })} className="card flex items-center justify-between gap-3 p-4 text-left hover:border-sky">
          <span>
            <b className="block text-[15px]">{u.title || "Untitled"}</b>
            <span className="text-[13px] text-ink-muted">Week of {u.week_start}</span>
          </span>
          <span className={cx("rounded px-2 py-0.5 text-[12px] font-bold", u.published_at ? "bg-sky-soft text-sky-ink" : "bg-paper text-ink-muted")}>{u.published_at ? "Published" : "Draft"}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- kit

const SECTIONS = [
  ["start", "Start here"],
  ["social", "Posts and stories"],
  ["profile", "Profile pictures and banners"],
  ["print", "Print"],
  ["email", "Email"],
  ["logos", "Logos"],
  ["video", "Video"],
  ["other", "More"],
] as const;

function Kit() {
  const { data: items } = useKitList();
  const act = useKitActions();
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [f, setF] = useState({ title: "", title_es: "", description: "", section: "social", audience: "all", lang: "both", url: "", caption: "", caption_es: "" });
  const [audience, setAudience] = useState<"all" | MemberKind>("all");
  const shown = (items ?? []).filter((k) => audience === "all" || k.audience === audience || k.audience === "all");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={() => setAdding((a) => !a)}>
          <Upload size={15} /> Add to the kit
        </button>
        <Segmented
          value={audience}
          onChange={setAudience}
          options={[
            ["all", "Everything"],
            ["organisation", "Organisations see"],
            ["company", "Companies see"],
            ["ambassador", "Ambassadors see"],
          ]}
        />
      </div>
      {adding && (
        <form
          className="card grid gap-3 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            act.add.mutate(
              { file, thumb, fields: { ...f, url: f.url || null, title_es: f.title_es || null, description: f.description || null, caption: f.caption || null, caption_es: f.caption_es || null } as Partial<PHKitItem> },
              {
                onSuccess: () => {
                  toast.success("Added. Members see it in their kit now.");
                  setAdding(false);
                  setFile(null);
                  setThumb(null);
                },
                onError: (err) => toast.error((err as Error).message),
              },
            );
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="label">File</span>
            <input id="k-file" type="file" className="field" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Or a link (Canva template, Drive folder)</span>
            <input id="k-url" className="field" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Title</span>
            <input id="k-title" className="field" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Title in Spanish</span>
            <input id="k-title-es" className="field" value={f.title_es} onChange={(e) => setF({ ...f, title_es: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="label">One line about it</span>
            <input id="k-desc" className="field" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Section</span>
            <select id="k-section" className="field" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })}>
              {SECTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="label">Who gets it</span>
              <select id="k-aud" className="field" value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>
                <option value="all">Everyone</option>
                <option value="organisation">Organisations</option>
                <option value="company">Companies</option>
                <option value="ambassador">Ambassadors</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label">Language</span>
              <select id="k-lang" className="field" value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })}>
                <option value="both">Both</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="label">Caption to copy (optional)</span>
            <textarea id="k-cap" className="field min-h-[70px]" value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Caption in Spanish</span>
            <textarea id="k-cap-es" className="field min-h-[70px]" value={f.caption_es} onChange={(e) => setF({ ...f, caption_es: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Preview picture (for PDFs and zips)</span>
            <input id="k-thumb" type="file" accept="image/*" className="field" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary" disabled={act.add.isPending || (!file && !f.url) || !f.title.trim()}>
              {act.add.isPending ? "Uploading…" : "Add"}
            </button>
          </div>
        </form>
      )}
      {!shown.length && <Empty title="The kit is empty" body="Add the partner kit, the company kit and the ambassador kit here; each member sees the one for them." />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((k) => {
          const thumb = kitPublicUrl(k.thumb_path) ?? (k.mime?.startsWith("image/") ? kitPublicUrl(k.file_path) : null);
          const href = kitPublicUrl(k.file_path) ?? k.url;
          return (
            <div key={k.id} className={cx("card flex gap-3 p-3", k.hidden && "opacity-50")}>
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-paper">
                {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain" /> : <Download size={20} className="text-ink-faint" />}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[14px]">{k.title}</b>
                <span className="text-[12px] text-ink-muted">
                  {{ all: "Everyone", organisation: "Organisations", company: "Companies", ambassador: "Ambassadors" }[k.audience]} · {{ both: "EN + ES", en: "English", es: "Spanish" }[k.lang]} · {SECTIONS.find(([v]) => v === k.section)?.[1]}
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-quiet">
                      <ExternalLink size={13} /> Open
                    </a>
                  )}
                  <button type="button" className="btn-quiet" onClick={() => act.update.mutate({ id: k.id, fields: { hidden: !k.hidden } })}>
                    {k.hidden ? <Eye size={13} /> : <EyeOff size={13} />} {k.hidden ? "Show" : "Hide"}
                  </button>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => {
                      if (window.confirm(`Remove "${k.title}" from the kit for everyone?`)) act.remove.mutate(k);
                    }}
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- members

function Members() {
  const { data: members, isLoading } = useMembers();
  const { data: waiting } = usePledgeWaiting();
  const act = useMemberActions();
  const [kind, setKind] = useState<"all" | MemberKind>("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [m, setM] = useState({ name: "", orgType: "ambassador", email: "", contactName: "", country: "", pledge: "" });
  const byId = useMemo(() => new Map((members ?? []).map((x) => [x.id, x])), [members]);
  const shown = (members ?? []).filter((x) => (kind === "all" || kindOf(x.org_type) === kind) && (!q || x.name.toLowerCase().includes(q.toLowerCase())));
  const counts = (members ?? []).reduce<Record<string, number>>((a, x) => ((a[kindOf(x.org_type)] = (a[kindOf(x.org_type)] ?? 0) + 1), a), {});

  return (
    <div className="flex flex-col gap-4">
      {(waiting ?? []).length > 0 && (
        <div className="card flex flex-col gap-2 border-sun/50 bg-sun-soft/40 p-4">
          <b className="text-[14.5px]">Pledges added in the hub, waiting for the partners sheet</b>
          <p className="text-[13px] text-ink-muted">Add each amount to the member's Pledge in the PKF_Partners sheet (the sheet sets the movement total), then mark it done here.</p>
          {(waiting ?? []).map((w) => (
            <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]">
              <span>
                <b>{byId.get(w.partner_id)?.name ?? "A member"}</b> +{w.amount.toLocaleString()} {w.note ? `· ${w.note}` : ""} · {when(w.created_at)}
              </span>
              <button type="button" className="btn-ghost" onClick={() => act.counted.mutate([w.id])}>
                <Check size={14} /> In the sheet
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            ["all", `All ${members?.length ?? 0}`],
            ["organisation", `Organisations ${counts.organisation ?? 0}`],
            ["company", `Companies ${counts.company ?? 0}`],
            ["ambassador", `Ambassadors ${counts.ambassador ?? 0}`],
          ]}
        />
        <input id="m-search" className="field max-w-[240px]" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn-primary" onClick={() => setAdding((a) => !a)}>
          <UserPlus size={15} /> Add a member
        </button>
      </div>
      <p className="text-[13px] text-ink-muted">
        Partners from the PKF_Partners sheet arrive here by themselves once their row says Approved and Portal Access Yes (HighLevel emails their invite). Add ambassadors, and anyone not in the sheet, here; then copy their invite link.
      </p>

      {adding && (
        <form
          className="card grid gap-3 p-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            act.add.mutate(
              { ...m, pledge: Number(m.pledge) || 0 },
              {
                onSuccess: (r) => {
                  setAdding(false);
                  void copy(r.invite_url, "Added. Their invite link is copied: send it to them.");
                },
                onError: (err) => toast.error((err as Error).message),
              },
            );
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="label">Name</span>
            <input id="m-name" className="field" required value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Kind</span>
            <select id="m-type" className="field" value={m.orgType} onChange={(e) => setM({ ...m, orgType: e.target.value })}>
              <option value="ambassador">Ambassador</option>
              <option value="company">Company</option>
              <option value="school">School</option>
              <option value="ngo">Nonprofit</option>
              <option value="faith">Faith group</option>
              <option value="government">Government</option>
              <option value="community">Community group</option>
              <option value="other">Other organisation</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Email (for sign-in links)</span>
            <input id="m-email" type="email" className="field" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Contact person</span>
            <input id="m-contact" className="field" value={m.contactName} onChange={(e) => setM({ ...m, contactName: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Country</span>
            <input id="m-country" className="field" value={m.country} onChange={(e) => setM({ ...m, country: e.target.value })} placeholder="Puerto Rico" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">Pledge (acts)</span>
            <input id="m-pledge" inputMode="numeric" className="field" value={m.pledge} onChange={(e) => setM({ ...m, pledge: e.target.value })} />
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary" disabled={act.add.isPending || !m.name.trim()}>
              Add and copy their invite link
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-paper" />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] font-semibold text-ink-muted">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Kind</th>
              <th className="py-2 pr-3">Where</th>
              <th className="py-2 pr-3">Joined</th>
              <th className="py-2 pr-3 text-right">People</th>
              <th className="py-2 pr-3 text-right">Acts</th>
              <th className="py-2 pr-3 text-right">Pledge</th>
              <th className="py-2 pr-3 text-right">Posts</th>
              <th className="py-2">Invite</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <MemberRow key={x.id} member={x} onKind={(orgType) => act.setKind.mutate({ id: x.id, orgType })} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberRow({ member: x, onKind }: { member: PHMember; onKind: (orgType: string) => void }) {
  const missing = [!x.contact_email && "email", !x.country && "country", !x.logo_path && !x.entry_logo_url && "logo"].filter(Boolean);
  return (
    <tr className="border-b border-line align-top">
      <td className="py-2.5 pr-3">
        <b>{x.name}</b>
        {missing.length > 0 && <span className="block text-[11.5px] text-ink-faint">No {missing.join(", ")} yet</span>}
      </td>
      <td className="py-2.5 pr-3">
        <select id={`kind-${x.id}`} className="rounded border border-line bg-white px-1.5 py-1 text-[12.5px]" value={x.org_type ?? "other"} onChange={(e) => onKind(e.target.value)} aria-label={`Kind of ${x.name}`}>
          <option value="ambassador">Ambassador</option>
          <option value="company">Company</option>
          <option value="school">School</option>
          <option value="ngo">Nonprofit</option>
          <option value="faith">Faith group</option>
          <option value="government">Government</option>
          <option value="community">Community group</option>
          <option value="other">Other organisation</option>
        </select>
      </td>
      <td className="py-2.5 pr-3 text-ink-muted">{[x.city, x.country].filter(Boolean).join(", ") || "–"}</td>
      <td className="py-2.5 pr-3">{x.joined ? <span className="font-semibold text-sky-ink">Yes</span> : <span className="text-ink-faint">Not yet</span>}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{x.staff}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{x.acts.toLocaleString()}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">
        {x.pledge_goal.toLocaleString()}
        {x.pledge_waiting > 0 && <span className="block text-[11.5px] font-semibold text-sun-ink">+{x.pledge_waiting.toLocaleString()} waiting</span>}
      </td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{x.posts}</td>
      <td className="py-2.5">
        <button type="button" className="btn-quiet" onClick={() => copy(x.invite_url, `Invite link for ${x.name} copied`)}>
          <Copy size={13} /> Copy
        </button>
      </td>
    </tr>
  );
}
