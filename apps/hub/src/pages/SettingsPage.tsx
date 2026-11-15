import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Avatar, cx, PageHead, PlatformDot, SampleTag } from "@/components/bits";
import { useAccounts, useAct, useEmails, useGhlPosts, useHub, useMe, useMembers } from "@/lib/hub";
import { team } from "@/lib/live";
import { PLATFORMS } from "@/lib/stages";
import type { Member, Platform } from "@/lib/types";

const ROLE_NOTE: Record<string, string> = {
  admin: "Can do everything, including settings",
  approver: "Can approve cards, schedule them and change the schedule",
  member: "Can plan and make content",
};

const HUB_DOES = ["Write, check, approve and schedule posts for every account", "Change the time or caption of a scheduled post, or take it off", "Upload videos and images, and set a cover", "Write and schedule email campaigns, and see opens and clicks", "Show reach, likes, comments, shares and new followers", "Keep the calendar for posts and emails in one place"];
const STAYS = [
  ["Connecting a social account for the first time", "Each platform asks the account owner to sign in and say yes. That is done once, in HighLevel."],
  ["Renewing a connection when it runs out", "The hub warns you three weeks ahead. The renewal itself is a sign-in in HighLevel."],
  ["The contact list and automations", "People, tags and the automatic email journeys live in HighLevel. The hub reads the lists; it does not rebuild them."],
];

const fmtDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const H2 = "text-[18px] font-extrabold tracking-[-0.02em]";

const COLORS = ["#00a3e0", "#f37023", "#d81b60", "#fdb813", "#0e234b"];

/** Live hub, admins only: add someone by the email they sign in with, change what they can do, or take them out. */
function TeamAdmin({ members, meId }: { members: Member[]; meId: string }) {
  const act = useAct();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Member["role"]>("member");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await act(async () => {
      await team.add(email, name, role, COLORS[members.length % COLORS.length]);
      return true;
    }, `${name.trim() || email.trim()} can now sign in to the hub`);
    if (ok) {
      setEmail("");
      setName("");
      setRole("member");
    }
  };

  return (
    <div className="mt-5">
      <ul className="space-y-1.5">
        {members
          .filter((m) => m.id !== meId)
          .map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-semibold">{m.name}</span>
              <select aria-label={`What ${m.name} can do`} value={m.role} onChange={(e) => void act(async () => team.setRole(m.id, e.target.value as Member["role"]), `${m.name} is now ${e.target.value === "admin" ? "an admin" : e.target.value === "approver" ? "an approver" : "a member"}`)} className="field h-8 w-auto py-0 text-[13px]">
                <option value="member">Member</option>
                <option value="approver">Approver</option>
                <option value="admin">Admin</option>
              </select>
              <button type="button" className="btn-quiet h-8 px-2.5 text-[12.5px]" onClick={() => void act(async () => team.remove(m.id), `${m.name} can no longer open the hub`)}>
                Remove
              </button>
            </li>
          ))}
      </ul>
      <form onSubmit={add} className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
        <p className="text-[14px] font-bold sm:col-span-2">Add someone</p>
        <div>
          <label htmlFor="team-email" className="label">
            The email they sign in with
          </label>
          <input id="team-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="team-name" className="label">
            Name
          </label>
          <input id="team-name" required value={name} onChange={(e) => setName(e.target.value)} className="field" />
        </div>
        <div>
          <label htmlFor="team-role" className="label">
            What they can do
          </label>
          <select id="team-role" value={role} onChange={(e) => setRole(e.target.value as Member["role"])} className="field">
            <option value="member">Member: plan and make content</option>
            <option value="approver">Approver: approve and schedule too</option>
            <option value="admin">Admin: everything, including the team</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary">
            Add to the hub
          </button>
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink-muted sm:col-span-2">They sign in with their pasalopalante.com account. If they don't have one yet, they create it there first with this email.</p>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const { store } = useHub();
  const act = useAct();
  const qc = useQueryClient();
  const { data: members = [] } = useMembers();
  const { data: accounts = [] } = useAccounts();
  const { data: me } = useMe();
  const { data: posts = [] } = useGhlPosts();
  const { data: emails = [] } = useEmails();
  const platforms = [...new Set(accounts.map((a) => a.platform))] as Platform[];
  const daysLeft = (iso?: string) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / 86400_000) : undefined);

  return (
    <>
      <PageHead title="Settings" sub="Who's on the team, which accounts are connected, and what the hub does for you behind the scenes." />

      <div className="grid gap-x-14 gap-y-12 lg:grid-cols-2">
        <section>
          <h2 className={cx(H2, "flex items-center gap-2")}>Team {store.mode === "demo" && <SampleTag>Preview team</SampleTag>}</h2>
          <ul className="mt-3 border-t border-line">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-line py-3">
                <Avatar member={m} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold">
                    {m.name} {me?.id === m.id && <span className="ml-1 text-[12px] font-semibold text-sky-ink">You</span>}
                  </p>
                  <p className="text-[12.5px] text-ink-muted">{ROLE_NOTE[m.role]}</p>
                </div>
                <span className="text-[13px] font-medium capitalize text-ink-muted">{m.role}</span>
                {store.mode === "demo" && me?.id !== m.id && (
                  <button type="button" className="btn-quiet h-8 px-2.5 text-[12.5px]" onClick={() => act((s) => s.setMe(m.id), `You're now looking at the hub as ${m.name}`)}>
                    View as
                  </button>
                )}
              </li>
            ))}
          </ul>
          {store.mode === "demo" && <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">In the preview you can view the hub as anyone, to see what a member, an approver and an admin can each do.</p>}
          {store.mode === "live" && me?.role === "admin" && <TeamAdmin members={members} meId={me.id} />}
          {store.mode === "live" && me?.role !== "admin" && <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">A hub admin adds people here by email. Site admins are hub admins already.</p>}
        </section>

        <section>
          <h2 className={H2}>Where the information comes from</h2>
          <ul className="mt-3 border-t border-line text-[14px]">
            <li className="flex items-start justify-between gap-4 border-b border-line py-3">
              <div>
                <p className="font-semibold">Posts, emails and statistics</p>
                <p className="text-[13px] text-ink-muted">
                  {accounts.length} accounts, {posts.length} posts and {emails.length} email campaigns, through HighLevel
                </p>
              </div>
              <span className="shrink-0 text-[13px] text-ink-muted">{store.mode === "demo" ? "Read on 11 Nov 2026" : "Connected"}</span>
            </li>
            <li className="flex items-start justify-between gap-4 border-b border-line py-3">
              <div>
                <p className="font-semibold">Cards, briefs and suggestions</p>
                <p className="text-[13px] text-ink-muted">{store.mode === "demo" ? "Kept in this browser for the preview" : "Kept in the Kindness Forward database"}</p>
              </div>
              <span className="shrink-0 text-[13px] text-ink-muted">{store.mode === "demo" ? "Preview" : "Live"}</span>
            </li>
            <li className="flex items-start justify-between gap-4 border-b border-line py-3">
              <div>
                <p className="font-semibold">Partners and ambassadors</p>
                <p className="text-[13px] text-ink-muted">The public partner list and ambassador directory the website already keeps</p>
              </div>
              <span className="shrink-0 text-[13px] text-ink-muted">{store.mode === "demo" ? "Read on 11 Nov 2026" : "Connected"}</span>
            </li>
          </ul>
          {store.mode === "demo" && (
            <button
              type="button"
              className="btn-ghost mt-4"
              onClick={async () => {
                if (!window.confirm("Put the preview back to how it started? Your changes here will be cleared.")) return;
                await store.reset();
                await qc.invalidateQueries({ queryKey: ["hub"] });
                toast.success("The preview is back to its starting point");
              }}
            >
              <RotateCcw size={15} /> Start the preview over
            </button>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className={H2}>What you no longer need to open HighLevel for</h2>
          <div className="mt-4 grid gap-x-14 gap-y-8 lg:grid-cols-2">
            <ul className="space-y-2.5">
              {HUB_DOES.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[14.5px] leading-snug">
                  <Check size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-[#2f9e6e]" /> {t}
                </li>
              ))}
            </ul>
            <div>
              <p className="eyebrow">Three things still happen there, rarely</p>
              <ul className="mt-2 border-t border-line">
                {STAYS.map(([name, body]) => (
                  <li key={name} className="border-b border-line py-3">
                    <p className="text-[14px] font-semibold">{name}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className={H2}>Connected accounts</h2>
          <p className="mt-1 text-[13.5px] text-ink-muted">The hub warns you here, and on the card, three weeks before a connection runs out.</p>
          <div className="mt-5 grid gap-x-10 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
            {platforms.map((p) => (
              <div key={p}>
                <p className="mb-1 flex items-center gap-2 text-[14px] font-bold">
                  <PlatformDot platform={p} size={18} /> {PLATFORMS[p].label}
                </p>
                <ul className="border-t border-line">
                  {accounts
                    .filter((a) => a.platform === p)
                    .map((a) => {
                      const d = daysLeft(a.expiresAt);
                      const soon = d !== undefined && d < 21;
                      return (
                        <li key={a.id} className="flex items-center gap-2.5 border-b border-line py-2.5">
                          {a.avatar ? <img src={a.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full bg-paper object-cover" /> : <span className="h-7 w-7 shrink-0 rounded-full bg-paper" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-semibold">{a.name}</p>
                            <p className={cx("flex items-center gap-1 text-[12px]", soon ? "font-semibold text-orange-ink" : "text-ink-faint")}>
                              {soon && <TriangleAlert size={12} />}
                              {a.expiresAt ? (d! < 0 ? `Connection ran out on ${fmtDate(a.expiresAt)}` : soon ? `Renew by ${fmtDate(a.expiresAt)}` : `Connected until ${fmtDate(a.expiresAt)}`) : "Connected, renews by itself"}
                            </p>
                          </div>
                          <span className="shrink-0 text-[12px] capitalize text-ink-faint">{a.kind}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
