import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Facebook, Instagram, Linkedin, Mail, MessageCircle, MessagesSquare, Music2, Send, Sparkles, Youtube } from "lucide-react";
import { toast } from "sonner";
import { cx, Empty, Segmented } from "@/components/bits";
import { checkCaption } from "@/lib/checks";
import { useAct, useHub, useInbox } from "@/lib/hub";
import { localDateTime } from "@/lib/time";
import type { Channel, Thread, ThreadMessage } from "@/lib/types";

// Messages and comments, from HighLevel, sorted by where they came in. Every reply is written and
// sent by a person: the hub never answers anyone by itself.

const CHANNELS: Record<Channel, { label: string; icon: typeof Mail; color: string }> = {
  email: { label: "Email", icon: Mail, color: "#0e234b" },
  instagram: { label: "Instagram", icon: Instagram, color: "#D62976" },
  facebook: { label: "Facebook", icon: Facebook, color: "#1877F2" },
  tiktok: { label: "TikTok", icon: Music2, color: "#111111" },
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  youtube: { label: "YouTube", icon: Youtube, color: "#FF0000" },
  chat: { label: "Website chat", icon: MessageCircle, color: "#005F85" },
  other: { label: "Other", icon: MessagesSquare, color: "#586176" },
};
const WAITING_LABEL: Record<Channel, string> = { email: "emails", instagram: "Instagram messages", facebook: "Facebook messages", tiktok: "TikTok messages", linkedin: "LinkedIn messages", youtube: "YouTube messages", chat: "website chats", other: "other messages" };
const ORDER: Channel[] = ["email", "instagram", "facebook", "tiktok", "linkedin", "youtube", "chat", "other"];
const LIMIT: Partial<Record<Channel, number>> = { instagram: 2200, facebook: 8000, linkedin: 3000, tiktok: 150, youtube: 10000 };
const CONVERSATIONS = "https://app.gohighlevel.com/v2/location/LKWlTUbJwER3Aj9HbawG/conversations/conversations";

function ChannelDot({ channel, size = 22 }: { channel: Channel; size?: number }) {
  const c = CHANNELS[channel];
  const Icon = c.icon;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full text-white" style={{ width: size, height: size, background: c.color }} title={c.label}>
      <Icon size={Math.round(size * 0.55)} strokeWidth={2.3} />
    </span>
  );
}

export default function Messages() {
  const { data, isLoading, error } = useInbox();
  const threads = useMemo(() => data?.threads ?? [], [data]);
  const live = data?.live ?? false;
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [show, setShow] = useState<"waiting" | "all">("waiting");
  const [kind, setKind] = useState<"both" | "message" | "comment">("both");
  const [openId, setOpenId] = useState<string | null>(null);

  const waitingBy = (c: Channel | "all") => threads.filter((t) => t.waiting && (c === "all" || t.channel === c)).length;
  const present = ORDER.filter((c) => threads.some((t) => t.channel === c));
  const list = threads.filter((t) => (channel === "all" || t.channel === channel) && (show === "all" || t.waiting) && (kind === "both" || t.kind === kind));
  const open = threads.find((t) => t.id === openId) ?? list[0];
  // what is waiting in HighLevel but cannot be read from the preview
  const hidden = !live && data?.counts ? ORDER.filter((c) => (data.counts!.waiting[c] ?? 0) > 0) : [];

  if (error) return <Empty title="The messages could not be loaded" body={error instanceof Error ? error.message : undefined} />;

  return (
    <div>
      {!live && (
        <div className="mb-6 rounded-xl border-l-[4px] border-sky bg-sky-soft/60 px-4 py-3 text-[13.5px] leading-relaxed text-ink">
          <span className="font-bold">Preview.</span> These are the real comments on the World Kindness Day posts, read from HighLevel on 15 November. Replies written here are not sent. Once the hub is live, emails and direct messages from HighLevel's Conversations show here too, and Send answers through HighLevel.
          {hidden.length > 0 && (
            <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold">Waiting in HighLevel now:</span>
              {hidden.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <ChannelDot channel={c} size={18} /> {data!.counts!.waiting[c]} {WAITING_LABEL[c]}
                </span>
              ))}
              <a href={CONVERSATIONS} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-sky-ink hover:underline">
                Open Conversations <ExternalLink size={13} />
              </a>
            </span>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", ...present] as const).map((c) => {
          const n = waitingBy(c);
          const active = channel === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cx("inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13.5px] font-semibold transition", active ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy/30")}
            >
              {c !== "all" && <ChannelDot channel={c} size={18} />}
              {c === "all" ? "Everywhere" : CHANNELS[c].label}
              {n > 0 && <span className={cx("rounded-full px-1.5 text-[12px] tabular-nums", active ? "bg-white/20" : "bg-orange-soft text-orange-ink")}>{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented value={show} onChange={setShow} options={[["waiting", "Waiting for us"], ["all", "Everything"]] as const} />
        <Segmented value={kind} onChange={setKind} options={[["both", "Messages and comments"], ["message", "Messages"], ["comment", "Comments"]] as const} />
      </div>

      {isLoading ? null : list.length === 0 ? (
        <Empty title={show === "waiting" ? "Nothing is waiting here" : "Nothing here yet"} body={show === "waiting" ? "Every message and comment here has an answer." : undefined} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <ul className="max-h-[70vh] overflow-y-auto rounded-xl border border-line">
            {list.map((t) => (
              <li key={t.id} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => setOpenId(t.id)} className={cx("flex w-full gap-3 px-4 py-3 text-left transition", open?.id === t.id ? "bg-paper" : "hover:bg-paper/60")}>
                  <ChannelDot channel={t.channel} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold">{t.who}</span>
                      {t.waiting && <span className="h-2 w-2 shrink-0 rounded-full bg-orange" title="Waiting for us" />}
                      {t.team && <span className="rounded bg-paper px-1.5 text-[11.5px] font-semibold text-ink-muted">Team</span>}
                      <span className="ml-auto shrink-0 text-[12px] text-ink-faint">{localDateTime(t.at)}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow:hidden]">{t.preview}</span>
                    <span className="mt-1 block truncate text-[12px] text-ink-muted">{t.kind === "comment" ? `Comment on: ${t.post ?? "a post"}` : `${CHANNELS[t.channel].label}${t.account ? `, to ${t.account}` : ""}`}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {open && <ThreadPanel key={open.id} t={open} live={live} />}
        </div>
      )}
    </div>
  );
}

function ThreadPanel({ t, live }: { t: Thread; live: boolean }) {
  const { store } = useHub();
  const act = useAct();
  const [messages, setMessages] = useState<ThreadMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const limit = t.kind === "comment" ? LIMIT[t.channel] : undefined;
  const canReply = t.kind === "comment" ? !!limit : ["email", "instagram", "facebook", "chat"].includes(t.channel);
  const findings = text.trim() ? checkCaption(text) : [];

  useEffect(() => {
    let gone = false;
    store
      .threadMessages(t)
      .then((m) => !gone && setMessages(m))
      .catch((e) => !gone && (setMessages([]), toast.error(e instanceof Error ? e.message : "The conversation could not be loaded.")));
    return () => {
      gone = true;
    };
  }, [store, t]);
  useEffect(() => {
    // newer browsers return a promise from scrollIntoView, which an effect must not hand back
    void end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const m = await act((s) => s.reply(t, text), live ? "Sent" : "Saved in the preview. Nothing was sent.");
    setSending(false);
    if (m) {
      setMessages((prev) => [...(prev ?? []), m]);
      setText("");
    }
  };

  return (
    <section className="flex min-h-[420px] flex-col rounded-xl border border-line">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
        <ChannelDot channel={t.channel} size={28} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-extrabold">{t.who}</p>
          <p className="truncate text-[12.5px] text-ink-muted">{t.kind === "comment" ? `${CHANNELS[t.channel].label} comment on: ${t.post ?? "a post"}` : `${CHANNELS[t.channel].label}${t.account ? `, to ${t.account}` : ""}${t.subject ? `: ${t.subject}` : ""}`}</p>
        </div>
        {t.link && (
          <a href={t.link} target="_blank" rel="noreferrer" className="btn-ghost h-8 text-[12.5px]">
            Open where it is <ExternalLink size={13} />
          </a>
        )}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: "48vh" }}>
        {messages === null ? (
          <p className="text-[13px] text-ink-faint">Loading the conversation…</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cx("flex", m.from === "us" ? "justify-end" : "justify-start")}>
              <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed", m.from === "us" ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-paper text-ink")}>
                {m.who && <p className={cx("mb-0.5 text-[11.5px] font-bold", m.from === "us" ? "text-white/75" : "text-ink-muted")}>{m.who}</p>}
                <p className="whitespace-pre-line break-words">{m.text}</p>
                <p className={cx("mt-1 text-[11px]", m.from === "us" ? "text-white/60" : "text-ink-faint")}>{localDateTime(m.at)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={end} />
      </div>

      <footer className="border-t border-line px-5 py-4">
        {!canReply ? (
          <p className="text-[13px] text-ink-muted">This kind of message is answered in HighLevel itself.</p>
        ) : (
          <>
            {t.suggested && !text && (
              <button type="button" onClick={() => setText(t.suggested!)} className="mb-2 flex w-full items-start gap-2 rounded-lg border border-dashed border-sky/60 bg-sky-soft/40 px-3 py-2 text-left text-[13px] text-ink hover:border-sky">
                <Sparkles size={14} className="mt-0.5 shrink-0 text-sky-ink" />
                <span>
                  <span className="font-semibold text-sky-ink">Suggested reply: </span>
                  {t.suggested}
                </span>
              </button>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={t.kind === "comment" ? "Reply to the comment. Ask a question back, so they answer again." : "Write your reply"}
              aria-label="Your reply"
              className="field resize-y leading-relaxed"
            />
            {findings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {findings.map((f) => (
                  <li key={f.id} className={cx("text-[12.5px] font-medium", f.level === "block" ? "text-rose-ink" : "text-orange-ink")}>
                    {f.title}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary h-9" disabled={!text.trim() || sending || (limit !== undefined && text.trim().length > limit)} onClick={() => void send()}>
                <Send size={14} /> {live ? "Send reply" : "Send (preview)"}
              </button>
              {limit !== undefined && <span className={cx("text-[12.5px] tabular-nums", text.length > limit ? "font-bold text-rose-ink" : "text-ink-faint")}>{text.length} / {limit}</span>}
              <span className="text-[12px] text-ink-faint">
                {live ? `Goes out from ${t.account ?? "our account"} through HighLevel, and your name goes in the team's log.` : "Preview: nothing leaves this browser."}
              </span>
            </div>
          </>
        )}
      </footer>
    </section>
  );
}
