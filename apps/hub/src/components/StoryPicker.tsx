import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import StoryTile from "./StoryTile";
import { useAct, useStories } from "@/lib/hub";
import type { Item } from "@/lib/types";

/** Choose something from the story bank for the card that is open. */
export default function StoryPicker({ item, open, onClose }: { item: Item; open: boolean; onClose: () => void }) {
  const act = useAct();
  const { data: stories = [] } = useStories();
  const [q, setQ] = useState("");
  const taken = new Set(item.assets.map((a) => a.storyId).filter(Boolean));
  const shown = stories.filter((s) => {
    if (taken.has(s.id)) return false;
    const text = [s.title, s.people, s.partner, s.country, s.words, ...s.tags].filter(Boolean).join(" ").toLowerCase();
    return q
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .every((w) => text.includes(w));
  });

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-navy/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-[70] flex max-h-[88vh] w-[calc(100vw-24px)] max-w-[860px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-lift outline-none data-[state=open]:animate-fade-in">
          <header className="flex items-center gap-3 border-b border-line px-5 py-3">
            <Dialog.Title className="text-[16px] font-extrabold">From the story bank</Dialog.Title>
            <label className="relative ml-auto w-[280px] max-w-full">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by person, country or tag" className="field h-9 pl-9" aria-label="Search the story bank" />
            </label>
            <Dialog.Close className="btn-quiet -mr-2 h-9 w-9 px-0" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </header>
          <div className="overflow-y-auto p-5">
            {shown.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-ink-muted">Nothing in the bank matches that.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {shown.map((s) => (
                  <li key={s.id}>
                    <StoryTile
                      story={s}
                      onOpen={async () => {
                        const res = await act((st) => st.attachStory(s.id, item.id), "Added from the story bank");
                        if (res) onClose();
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
