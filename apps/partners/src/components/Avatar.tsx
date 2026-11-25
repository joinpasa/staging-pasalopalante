import { KIND_COLOR, KIND_TINT, type Kind } from "@/lib/kinds";

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "·";
}

/** A member's logo in a white square, or their initials on their kind's tint. */
export default function Avatar({ name, url, kind, size = 40 }: { name: string; url?: string | null; kind: Kind; size?: number }) {
  const style = { width: size, height: size };
  if (url) {
    return (
      <span className="flex shrink-0 items-center justify-center overflow-hidden border-[1.5px] border-hair bg-white" style={style}>
        <img src={url} alt="" className="h-full w-full object-contain p-[8%]" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center font-extrabold"
      style={{ ...style, background: KIND_TINT[kind], color: kind === "ambassador" ? "#6B4A00" : KIND_COLOR[kind], fontSize: Math.max(11, size * 0.36) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
