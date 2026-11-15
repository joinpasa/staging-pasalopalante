import { Link } from "react-router-dom";
import { Plus, TriangleAlert } from "lucide-react";
import { cx, PageHead } from "@/components/bits";
import { useAct, useEmails, useHub, useItems, useMe, useStats } from "@/lib/hub";
import { prDateTime } from "@/lib/time";

const STATUS: Record<string, { label: string; bar: string }> = {
  scheduled: { label: "Scheduled", bar: "bg-navy" },
  processing: { label: "Sending now", bar: "bg-orange" },
  sent: { label: "Sent", bar: "bg-[#2f9e6e]" },
  draft: { label: "Draft", bar: "bg-ink-faint" },
};
const BAR = "#0086BA";

/** Every email campaign with how it did, and a way to write the next one with the same checks as a post. */
export default function EmailsPage() {
  const { open } = useHub();
  const act = useAct();
  const { data: emails = [] } = useEmails();
  const { data: stats } = useStats();
  const { data: items = [] } = useItems();
  const { data: me } = useMe();
  const drafts = items.filter((i) => i.format === "email" && i.stage !== "posted");
  const rows = [...emails].sort((a, b) => b.at.localeCompare(a.at));

  const write = async () => {
    const item = await act((s) => s.createItem({ format: "email", stage: "planning", ownerId: me?.id }));
    if (item) open(item.id);
  };

  return (
    <>
      <PageHead
        title="Emails"
        sub="Every campaign, with how many people opened it and clicked. Write the next one here and it goes through the same checks and sign-off as a post."
        actions={
          <button type="button" onClick={write} className="btn-primary">
            <Plus size={16} strokeWidth={2.6} /> Write an email
          </button>
        }
      />

      {drafts.length > 0 && (
        <section className="mb-10">
          <h2 className="section-title">Being written</h2>
          <ul className="mt-2 border-t border-line">
            {drafts.map((d) => (
              <li key={d.id} className="border-b border-line">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => open(d.id)} className="flex min-w-0 flex-1 items-center gap-4 py-3 text-left text-[14px] transition hover:bg-paper">
                    <span className="min-w-0 flex-1 truncate font-semibold">{d.subject || d.title || "Untitled email"}</span>
                    <span className="text-[13px] capitalize text-ink-muted">{d.stage}</span>
                  </button>
                  <Link to={`/newsletter/${d.id}`} className="btn-primary h-8 shrink-0 text-[13px]">
                    {d.design ? "Open the design" : "Design the email"}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="scroll-x overflow-x-auto">
        <table className="w-full min-w-[820px] border-t border-line text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12.5px] text-ink-muted">
              <th className="py-2.5 pr-4 font-medium">Campaign</th>
              <th className="py-2.5 pr-4 font-medium">Status</th>
              <th className="py-2.5 pr-4 text-right font-medium">Delivered</th>
              <th className="w-[22%] py-2.5 pr-4 font-medium">Opened</th>
              <th className="py-2.5 pr-4 text-right font-medium">Clicked</th>
              <th className="whitespace-nowrap py-2.5 text-right font-medium">Unsubscribed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const st = STATUS[e.status] ?? { label: e.status, bar: "bg-ink-faint" };
              const s = stats?.emails[e.id];
              return (
                <tr key={e.id} className="border-b border-line align-top">
                  <th scope="row" className="py-3 pr-4 font-normal">
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block text-[12.5px] text-ink-muted">{prDateTime(e.at)}, Puerto Rico time</span>
                    {s && s.bounceRate > 5 && (
                      <span className="mt-1 flex items-center gap-1.5 text-[12.5px] font-medium text-orange-ink">
                        <TriangleAlert size={13} /> {Math.round(s.bounceRate)}% of this list bounced. A tidy of old addresses would help the next send land.
                      </span>
                    )}
                  </th>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span className={cx("h-3 w-[3px] rounded-full", st.bar)} /> {st.label}
                    </span>
                  </td>
                  {s ? (
                    <>
                      <td className="py-3 pr-4 text-right tabular-nums">{s.delivered.toLocaleString("en-US")}</td>
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2.5">
                          <span className="h-2 flex-1 rounded-r-[4px] bg-paper">
                            <span className="block h-full rounded-r-[4px]" style={{ width: `${Math.min(100, s.openRate)}%`, background: BAR }} />
                          </span>
                          <span className="w-[76px] whitespace-nowrap text-right tabular-nums">
                            <span className="font-semibold">{Math.round(s.openRate)}%</span> <span className="text-ink-faint">({s.opened})</span>
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums">
                        <span className="font-semibold">{s.clickRate.toFixed(1)}%</span> <span className="text-ink-faint">({s.clicked})</span>
                      </td>
                      <td className="py-3 text-right tabular-nums">{s.unsubscribed}</td>
                    </>
                  ) : (
                    <td colSpan={4} className="py-3 text-ink-faint">
                      Figures appear once it has been sent
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">The nine most recent campaigns of 58, read from HighLevel on 11 November 2026. A "resend to unopened" is a second send to people who did not open the first, so its figures are always lower.</p>
    </>
  );
}
