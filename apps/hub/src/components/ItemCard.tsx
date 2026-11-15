import { Ban, TriangleAlert, Undo2 } from "lucide-react";
import { Avatar, cx, FormatBadge, PlatformRow, Thumb } from "./bits";
import { blockers, warnings } from "@/lib/checks";
import { prDateTime } from "@/lib/time";
import type { Account, Item, Member } from "@/lib/types";

interface Props {
  item: Item;
  members: Member[];
  accounts: Account[];
  onOpen: () => void;
  draggable?: boolean;
}

export default function ItemCard({ item, members, accounts, onOpen, draggable }: Props) {
  const owner = members.find((m) => m.id === item.ownerId);
  const hasThumb = item.assets.length > 0;
  // checks only matter once a card is being readied to go out
  const live = ["review", "approved"].includes(item.stage);
  const blocks = live ? blockers(item) : [];
  const warns = live ? warnings(item) : [];

  return (
    <button
      type="button"
      onClick={onOpen}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/hub-item", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group block w-full cursor-pointer overflow-hidden rounded-xl border border-line bg-white text-left transition hover:border-navy/40 active:bg-paper"
    >
      {hasThumb && <Thumb item={item} className="aspect-[16/9] w-full border-b border-line" />}
      <div className="p-3">
        <p className={cx("text-[14px] font-semibold leading-snug", !item.title && "text-ink-faint")}>{item.title || "Untitled"}</p>

        {item.needsChanges && (
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-orange-ink">
            <Undo2 size={13} strokeWidth={2.4} className="mt-0.5 shrink-0" /> {item.needsChanges}
          </p>
        )}
        {blocks.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-rose-ink" title={blocks.map((b) => b.title).join("\n")}>
            <Ban size={13} strokeWidth={2.4} className="mt-0.5 shrink-0" /> {blocks[0].title}
          </p>
        )}
        {blocks.length === 0 && warns.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-semibold leading-snug text-sun-ink" title={warns.map((b) => b.title).join("\n")}>
            <TriangleAlert size={13} strokeWidth={2.4} className="mt-0.5 shrink-0" /> {warns.length === 1 ? warns[0].title : `${warns.length} things to check`}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <FormatBadge format={item.format} />
            {item.publishAt && <p className="mt-0.5 truncate text-[12px] font-medium text-ink-faint">{prDateTime(item.publishAt)}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PlatformRow accountIds={item.accountIds} accounts={accounts} size={17} />
            <Avatar member={owner} size={22} />
          </div>
        </div>
      </div>
    </button>
  );
}
