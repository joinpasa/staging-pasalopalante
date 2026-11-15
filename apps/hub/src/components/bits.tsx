import { createContext, useContext, type ReactNode } from "react";
import { Facebook, Film, Image as ImageIcon, Instagram, Layers, Linkedin, Mail, Music2, Pin, Smartphone, Video, Youtube } from "lucide-react";
import { formatLabel, PLATFORMS, stageMeta } from "@/lib/stages";
import { LEVERS } from "@/lib/levers";
import type { Account, Format, Item, Lever, Member, Platform, Stage } from "@/lib/types";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** The hub's mark: two bars. An 11, and a pause. */
export function PauseMark({ className = "h-4", tone = "brand" }: { className?: string; tone?: "brand" | "ink" | "white" }) {
  const a = tone === "brand" ? "bg-sun" : tone === "ink" ? "bg-navy" : "bg-white";
  const b = tone === "brand" ? "bg-sky" : tone === "ink" ? "bg-navy" : "bg-white";
  return (
    <span className={cx("inline-flex items-stretch gap-[3px]", className)} aria-hidden>
      <span className={cx("w-[5px] rounded-[2px]", a)} />
      <span className={cx("w-[5px] rounded-[2px]", b)} />
    </span>
  );
}

export function Avatar({ member, size = 26 }: { member?: Member; size?: number }) {
  if (!member)
    return <span className="inline-block shrink-0 rounded-full border border-dashed border-ink-faint/60" style={{ width: size, height: size }} title="No owner yet" />;
  return (
    <span
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: member.color, color: member.color === "#fdb813" ? "#0e234b" : "#fff" }}
      title={member.name}
    >
      {member.name.slice(0, 1)}
    </span>
  );
}

/** A stage, written the same way everywhere: a small bar in the stage's colour, then its name. */
export function StagePill({ stage, className }: { stage: Stage; className?: string }) {
  const m = stageMeta(stage);
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1.5 rounded-md bg-paper pl-1.5 pr-2 text-[12px] font-semibold text-ink", className)}>
      <span className={cx("h-3 w-[3px] rounded-full", m.bar)} />
      {m.label}
    </span>
  );
}

const PLATFORM_ICON: Record<Platform, typeof Facebook> = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, tiktok: Music2, youtube: Youtube, pinterest: Pin };

export function PlatformDot({ platform, size = 18 }: { platform: Platform; size?: number }) {
  const Icon = PLATFORM_ICON[platform] ?? Smartphone;
  const meta = PLATFORMS[platform];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full text-white" style={{ width: size, height: size, background: meta?.color ?? "#586176" }} title={meta?.label ?? platform}>
      <Icon size={Math.round(size * 0.56)} strokeWidth={2.4} />
    </span>
  );
}

/** The platforms an item goes to, one dot each. */
export function PlatformRow({ accountIds, accounts, size = 18 }: { accountIds: string[]; accounts: Account[]; size?: number }) {
  const platforms = [...new Set(accountIds.map((id) => accounts.find((a) => a.id === id)?.platform).filter(Boolean))] as Platform[];
  if (!platforms.length) return null;
  return (
    <span className="inline-flex items-center -space-x-1">
      {platforms.map((p) => (
        <span key={p} className="rounded-full ring-2 ring-white">
          <PlatformDot platform={p} size={size} />
        </span>
      ))}
    </span>
  );
}

const FORMAT_ICON: Record<Format, typeof Film> = { reel: Film, story: Smartphone, carousel: Layers, image: ImageIcon, video: Video, email: Mail };

export function FormatBadge({ format }: { format: Format }) {
  const Icon = FORMAT_ICON[format];
  return (
    <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-muted">
      <Icon size={13} strokeWidth={2.2} />
      {formatLabel(format)}
    </span>
  );
}

/** The picture that stands for an item: its cover, else its first file. */
export function Thumb({ item, className }: { item: Pick<Item, "assets" | "format">; className?: string }) {
  const cover = item.assets.find((a) => a.kind === "cover");
  const media = item.assets.find((a) => a.kind === "media");
  const src = cover ?? media;
  if (!src) return null;
  if (src.mime.startsWith("video/")) return <video src={`${src.url}#t=0.1`} muted playsInline preload="metadata" className={cx("bg-paper object-cover object-[50%_60%]", className)} />;
  return <img src={src.url} alt="" loading="lazy" className={cx("bg-paper object-cover object-[50%_60%]", className)} />;
}

/** Set when a page is shown inside another one (Plan's views, Growth's results): its own title steps aside. */
export const EmbedCtx = createContext(false);

export function PageHead({ title, sub, actions, eyebrow }: { title: string; sub?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  const embedded = useContext(EmbedCtx);
  if (embedded) return actions ? <div className="mb-6 flex flex-wrap items-center justify-end gap-2">{actions}</div> : null;
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink-muted">{eyebrow}</p>}
        <h1 className="text-[30px] font-extrabold leading-[1.12] tracking-[-0.03em]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-[640px] text-[14.5px] leading-relaxed text-ink-muted">{sub}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <PauseMark className="mx-auto mb-4 h-6" tone="ink" />
      <p className="text-[15px] font-bold">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-[14px] text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LeverChip({ lever, className }: { lever: Lever; className?: string }) {
  const m = LEVERS[lever];
  return (
    <span className={cx("inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-md bg-paper px-1.5 text-[12px] font-semibold text-ink-muted", className)} title={m.why}>
      <span className={cx("h-2 w-2 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function SampleTag({ children = "Sample" }: { children?: ReactNode }) {
  return <span className="inline-flex h-5 items-center rounded bg-sun-soft px-1.5 text-[11px] font-bold text-sun-ink">{children}</span>;
}

/** A choice between a few views, e.g. New / Answered. */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: NoInfer<T>) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-[10px] border border-line bg-paper p-0.5">
      {options.map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k as T)} aria-pressed={value === k} className={cx("rounded-lg px-3 py-1 text-[13px] font-semibold transition", value === k ? "bg-white text-navy shadow-[0_1px_2px_rgba(14,35,75,0.12)]" : "text-ink-muted hover:text-navy")}>
          {label}
        </button>
      ))}
    </div>
  );
}
