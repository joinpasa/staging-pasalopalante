import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { cx, PageHead, Segmented } from "@/components/bits";
import { useAccounts, useAct, useHub, useItems, useMe, useMembers } from "@/lib/hub";
import { STAGES } from "@/lib/stages";
import type { Stage } from "@/lib/types";

export default function PipelinePage() {
  const { open } = useHub();
  const act = useAct();
  const { data: items = [] } = useItems();
  const { data: members = [] } = useMembers();
  const { data: accounts = [] } = useAccounts();
  const { data: me } = useMe();
  const [who, setWho] = useState<"all" | "mine">("all");
  const [over, setOver] = useState<Stage | null>(null);

  const shown = who === "mine" && me ? items.filter((i) => i.ownerId === me.id) : items;

  const add = async () => {
    const item = await act((s) => s.createItem({ stage: "idea" }));
    if (item) open(item.id);
  };

  const drop = async (stage: Stage, id: string) => {
    setOver(null);
    if (!id) return;
    await act((s) => s.moveItem(id, stage));
  };

  return (
    <>
      <PageHead
        title="Pipeline"
        sub="Every piece of content, from first idea to live. Drag a card to move it on, or open it to work on it."
        actions={
          <>
            <Segmented
              value={who}
              onChange={setWho}
              options={
                [
                  ["all", "Everyone"],
                  ["mine", "Mine"],
                ] as const
              }
            />
            <button type="button" onClick={add} className="btn-ghost">
              <Plus size={16} strokeWidth={2.4} /> Add an idea
            </button>
          </>
        }
      />

      <div className="scroll-x -mx-5 overflow-x-auto px-5 pb-6 md:-mx-10 md:px-10">
        <div className="flex gap-4">
          {STAGES.map((stage) => {
            const cards = shown.filter((i) => i.stage === stage.id);
            const locked = stage.id === "scheduled" || stage.id === "posted";
            return (
              <section
                key={stage.id}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes("text/hub-item")) return;
                  e.preventDefault();
                  setOver(stage.id);
                }}
                onDragLeave={() => setOver((cur) => (cur === stage.id ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(stage.id, e.dataTransfer.getData("text/hub-item"));
                }}
                className="flex min-w-[204px] flex-1 basis-0 flex-col"
              >
                <header className="mb-3">
                  <span className={cx("block h-[3px] rounded-full", stage.bar)} />
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <h2 className="text-[14px] font-bold">{stage.label}</h2>
                    <span className="text-[13px] font-semibold tabular-nums text-ink-faint">{cards.length}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-faint">{stage.hint}</p>
                  {stage.id === "review" && cards.length > 0 && (
                    <Link to="/review" className="mt-1 inline-block text-[12.5px] font-semibold text-sky-ink hover:underline">
                      Review one by one
                    </Link>
                  )}
                </header>
                <div className={cx("-m-1.5 flex min-h-[120px] flex-1 flex-col gap-2 rounded-xl p-1.5 transition", over === stage.id && "bg-sky-soft outline-dashed outline-2 outline-sky")}>
                  {cards.map((item) => (
                    <ItemCard key={item.id} item={item} members={members} accounts={accounts} onOpen={() => open(item.id)} draggable={!locked} />
                  ))}
                  {cards.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[12.5px] text-ink-faint">{stage.id === "idea" ? "No ideas waiting" : "Nothing here yet"}</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
