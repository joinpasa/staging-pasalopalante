import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Award, Download, Globe, HandHeart, Heart, Image as ImageIcon, Layers, LifeBuoy, LogOut, MapPin, MessageSquareHeart, MessageSquareWarning, MoreHorizontal, Pencil, PenLine, Plus, QrCode, Sparkles, Trophy, Users } from "lucide-react";
import Shell from "@/components/Shell";
import Avatar from "@/components/Avatar";
import Sheet from "@/components/Sheet";
import PostCard from "@/components/PostCard";
import StatusPill from "@/components/StatusPill";
import ActMenu from "@/components/ActMenu";
import LogOneDialog from "@/components/LogOneDialog";
import { kindWords, useHubCopy } from "@/lib/hubCopy";
import { useSession } from "@/lib/session";
import { timeAgo, useAddPledge, useFeed, useMe, usePledgeAdds, useTeam, type Post } from "@/lib/hub";
import { actsLogged, useSubmissions } from "@/lib/submissions";
import { kindLabel, KIND_COLOR, KIND_TINT, orgTypeLabel } from "@/lib/kinds";
import { countryLabel } from "@/lib/geo";
import { drawCertificate, saveBlob } from "@/lib/certificate";
import { openSupportChat } from "@/lib/supportChat";

type Tab = "acts" | "posts" | "team";

/** "Me": a profile page the way social apps do it, plus the pledge and the acts. */
export default function MePage() {
  const { h, lang, locale, toggle } = useHubCopy();
  const { staff, logout } = useSession();
  const { data: me } = useMe();
  const { data: rows, isLoading } = useSubmissions();
  const { data: team } = useTeam();
  const mine = useFeed({ partnerId: me?.id ?? null, limit: 30 });
  const myPosts = (mine.data?.pages.flat() ?? []).filter((p) => p.mine);
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("acts");
  const [pledging, setPledging] = useState(false);
  const [menu, setMenu] = useState(false);
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [certBusy, setCertBusy] = useState(false);

  const logOpen = location.pathname === "/log";
  const editId = location.pathname.startsWith("/edit/") ? location.pathname.slice("/edit/".length) : null;
  const editing = editId ? rows?.find((r) => r.id === editId && r.status === "changes_requested") : undefined;
  useEffect(() => {
    if (editId && rows && !editing) navigate("/me", { replace: true });
  }, [editId, rows, editing, navigate]);

  if (!me) return <Shell>{<div className="h-72 animate-pulse bg-tint-sky/60" />}</Shell>;

  const words = kindWords(me.kind, lang);
  const solo = me.kind === "ambassador";
  const logged = actsLogged(rows);
  const goal = me.pledgeTotal;
  const pct = goal > 0 ? Math.min(100, Math.round((logged / goal) * 100)) : 0;
  const needsChanges = (rows ?? []).filter((r) => r.status === "changes_requested");
  const place = [me.city, me.region, me.country ? countryLabel(me.country, lang) : null].filter(Boolean).join(", ");

  const pledgeMet = goal > 0 && logged >= goal;
  const es = lang === "es";
  const badges = [
    { icon: Award, color: "#f37023", tint: "bg-tint-orange", done: logged >= 1, label: es ? "Primer acto" : "First act" },
    { icon: Award, color: "#f37023", tint: "bg-tint-orange", done: logged >= 100, label: es ? "100 actos" : "100 acts" },
    { icon: Award, color: "#f37023", tint: "bg-tint-orange", done: logged >= 1000, label: es ? "1,000 actos" : "1,000 acts" },
    { icon: Award, color: "#f37023", tint: "bg-tint-orange", done: logged >= 10000, label: es ? "10,000 actos" : "10,000 acts" },
    { icon: Trophy, color: "#d81b60", tint: "bg-tint-pink", done: pledgeMet, label: es ? "Meta cumplida" : "Pledge met" },
    { icon: PenLine, color: "#00a3e0", tint: "bg-tint-sky", done: myPosts.some((p) => p.audience === "community"), label: es ? "Primera publicación" : "First post" },
    { icon: MessageSquareHeart, color: "#d81b60", tint: "bg-tint-pink", done: myPosts.some((p) => p.audience === "team"), label: es ? "Cuentacuentos" : "Storyteller" },
    { icon: Sparkles, color: "#c48a00", tint: "bg-tint-gold", done: myPosts.some((p) => !!p.usedAt), label: es ? "Destacado" : "Featured" },
    { icon: MapPin, color: "#00a3e0", tint: "bg-tint-sky", done: !!me.country, label: es ? "En el mapa" : "On the map" },
    { icon: HandHeart, color: "#c48a00", tint: "bg-tint-gold", done: me.pledgeAdded > 0, label: es ? "Compromiso creciente" : "Growing pledge" },
    ...(solo ? [] : [{ icon: Users, color: "#00a3e0", tint: "bg-tint-sky", done: (team?.length ?? 0) >= 5, label: es ? "Equipo de 5" : "Team of 5" }]),
  ];
  const earned = badges.filter((b) => b.done).length;

  async function certificate() {
    setCertBusy(true);
    try {
      const blob = await drawCertificate({ name: me!.name, acts: logged, lang, locale, logoUrl: me!.logoUrl });
      saveBlob(blob, `${me!.name.replace(/[^\w\- ]+/g, "").trim() || "kindness"} - certificate.png`);
    } finally {
      setCertBusy(false);
    }
  }

  const stats = [
    { label: h.actsLogged, value: logged },
    { label: h.pledge, value: goal },
    { label: h.posts, value: myPosts.length },
    ...(solo ? [] : [{ label: h.people, value: team?.length ?? 0 }]),
  ];
  const tabs: { id: Tab; label: string }[] = [
    { id: "acts", label: h.tabActs },
    { id: "posts", label: h.tabPosts },
    ...(solo ? [] : [{ id: "team" as Tab, label: h.tabTeam }]),
  ];

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        {/* profile head */}
        <div className="flex items-start gap-4">
          <Avatar name={me.name} url={me.logoUrl} kind={me.kind} size={84} />
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="m-0 text-[22px] font-extrabold leading-tight [overflow-wrap:anywhere]">{me.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="chip" style={{ background: KIND_TINT[me.kind], color: me.kind === "ambassador" ? "#6B4A00" : KIND_COLOR[me.kind] }}>
                {me.kind === "organisation" ? orgTypeLabel(me.orgType, lang) : kindLabel(me.kind, lang)}
              </span>
              {place && <span className="text-[13px] font-semibold text-ink-muted">{place}</span>}
            </div>
            {me.about && <p className="m-0 mt-2 text-[14.5px] font-medium leading-snug text-ink2">{me.about}</p>}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} className="flex h-10 w-10 items-center justify-center text-ink2 hover:bg-tint-sky" aria-label="Menu">
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
            {menu && (
              <div className="absolute end-0 top-11 z-20 flex w-52 flex-col border-[1.5px] border-hair bg-white p-1 shadow-card">
                <button type="button" onClick={() => (toggle(), setMenu(false))} className="flex h-11 items-center gap-2.5 px-3 text-sm font-semibold hover:bg-tint-sky">
                  <Globe className="h-4 w-4 text-sky" aria-hidden="true" />
                  {h.language}
                </button>
                <button
                  type="button"
                  onClick={() => (openSupportChat(staff ? { name: staff.name, organization: me.name } : undefined), setMenu(false))}
                  className="flex h-11 items-center gap-2.5 px-3 text-sm font-semibold hover:bg-tint-sky"
                >
                  <LifeBuoy className="h-4 w-4 text-sky" aria-hidden="true" />
                  {h.help}
                </button>
                <button type="button" onClick={() => void logout()} className="flex h-11 items-center gap-2.5 px-3 text-sm font-semibold text-rose-ink hover:bg-rose-soft">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {h.signOut}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* the numbers, like followers on a profile */}
        <div className={`grid border-y-[1.5px] border-hair py-3 text-center ${solo ? "grid-cols-3" : "grid-cols-4"}`}>
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <div className="text-xl font-extrabold tabular-nums">{s.value.toLocaleString(locale)}</div>
              <div className="truncate text-[12px] font-semibold text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="h-2.5 bg-tint-gold" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={words.ourKindness}>
            <div className="h-2.5 bg-bar" style={{ width: `${Math.max(pct, logged > 0 ? 2 : 0)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[12.5px] font-bold text-ink-muted">
            <span>{pct}%</span>
            {me.pledgeAdded > 0 && <span className="text-[#6B4A00]">+{me.pledgeAdded.toLocaleString(locale)} · {h.pledgeWaiting.toLowerCase()}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/me/edit" className="btn-line h-11">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {h.editProfile}
          </Link>
          <button type="button" onClick={() => setPledging(true)} className="btn-soft h-11">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {h.addPledge}
          </button>
        </div>

        {/* badges */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[15px] font-extrabold">
              {es ? "Insignias" : "Badges"} <span className="font-bold text-ink-faint">{earned}/{badges.length}</span>
            </h2>
            {logged > 0 && (
              <button type="button" onClick={certificate} disabled={certBusy} className="btn-quiet">
                <Download className="h-4 w-4" aria-hidden="true" />
                {h.getCertificate}
              </button>
            )}
          </div>
          <div className="-mx-4 mt-2.5 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {[...badges.filter((b) => b.done), ...badges.filter((b) => !b.done)].map((b) => (
              <div
                key={b.label}
                className={`flex w-[88px] shrink-0 flex-col items-center gap-1.5 px-1 py-3 text-center ${b.done ? b.tint : "border-[1.5px] border-dashed border-hair"}`}
                title={b.label}
              >
                <b.icon className="h-7 w-7" style={{ color: b.done ? b.color : "#dcecf5" }} aria-hidden="true" />
                <span className={`text-[11.5px] font-extrabold leading-tight ${b.done ? "text-navy" : "text-ink-faint"}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* tabs */}
        <div role="tablist" className="flex border-b-[1.5px] border-hair">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-[1.5px] h-11 flex-1 border-b-[3px] text-sm font-extrabold ${tab === t.id ? "border-sky text-navy" : "border-transparent text-ink-faint"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "acts" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Link to="/log" className="btn-orange h-11">
                <Heart className="h-4 w-4" aria-hidden="true" />
                {h.logAct}
              </Link>
              <Link to="/bulk" className="btn-line h-11">
                <Layers className="h-4 w-4" aria-hidden="true" />
                {h.logMany}
              </Link>
            </div>
            {needsChanges.length > 0 && (
              <Link to={`/edit/${needsChanges[0].id}`} className="flex items-center gap-3 bg-rose-soft px-3 py-3 text-sm font-bold text-rose-ink no-underline">
                <MessageSquareWarning className="h-5 w-5 shrink-0" aria-hidden="true" />
                {lang === "es" ? `${needsChanges.length} acto(s) necesitan cambios` : `${needsChanges.length} act${needsChanges.length > 1 ? "s" : ""} need${needsChanges.length > 1 ? "" : "s"} changes`}
              </Link>
            )}
            {isLoading && <div className="h-40 animate-pulse bg-tint-sky/60" />}
            {!isLoading && (rows ?? []).length === 0 && <p className="m-0 py-8 text-center text-sm font-semibold text-ink-faint">{h.noActs}</p>}
            {(rows ?? []).map((r, i) => {
              const editable = r.status === "changes_requested";
              return (
                <div key={r.id} className="flex items-center gap-3 border-b-[1.5px] border-hair pb-3">
                  {r.thumbUrl ? (
                    <img src={r.thumbUrl} alt="" className="h-14 w-14 shrink-0 object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-tint-orange text-orange">
                      <ImageIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {editable ? (
                      <Link to={`/edit/${r.id}`} className="block text-[14.5px] font-bold text-navy no-underline [overflow-wrap:anywhere]">
                        {r.description}
                      </Link>
                    ) : (
                      <span className="block text-[14.5px] font-bold [overflow-wrap:anywhere]">{r.description}</span>
                    )}
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-muted">
                      <StatusPill status={r.status} />
                      {r.people_count.toLocaleString(locale)} · {new Date(`${r.act_date}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <ActMenu act={r} tourTarget={i === 0} />
                </div>
              );
            })}
          </div>
        )}

        {tab === "posts" && (
          <div>
            {myPosts.length === 0 ? (
              <p className="m-0 py-8 text-center text-sm font-semibold text-ink-faint">{h.noPosts}</p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {myPosts.map((p) => {
                  const pic = p.media.find((m) => m.type === "image" && m.url);
                  return (
                    <button key={p.id} type="button" onClick={() => setOpenPost(p)} className="relative aspect-square overflow-hidden bg-tint-sky text-start">
                      {pic ? (
                        <img src={pic.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="line-clamp-5 p-2.5 text-[12.5px] font-semibold leading-snug text-navy">{p.body}</span>
                      )}
                      {p.usedAt && <span className="absolute bottom-1 start-1 bg-gold px-1.5 text-[10px] font-extrabold text-navy">★</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "team" && !solo && (
          <div className="flex flex-col gap-3">
            <Link to="/invite" className="btn-soft h-11">
              <QrCode className="h-4 w-4" aria-hidden="true" />
              {h.inviteTeam}
            </Link>
            {(team ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b-[1.5px] border-hair pb-3">
                <Avatar name={p.name} kind={me.kind} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-bold">{p.name}</div>
                  <div className="text-[12.5px] font-semibold text-ink-faint">{p.last_login_at ? timeAgo(p.last_login_at, locale) : "–"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PledgeSheet open={pledging} onClose={() => setPledging(false)} />
      <Sheet open={!!openPost} onClose={() => setOpenPost(null)} title={h.posts} wide>
        {openPost && <PostCard post={openPost} />}
      </Sheet>
      <LogOneDialog open={logOpen || !!editing} editing={editing} onClose={() => navigate("/me")} />
    </Shell>
  );
}

function PledgeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { h, locale } = useHubCopy();
  const add = useAddPledge();
  const { data: adds } = usePledgeAdds();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const n = Number(amount.replace(/[^\d]/g, ""));

  async function submit() {
    setError(null);
    try {
      await add.mutateAsync({ amount: n, note });
      setAmount("");
      setNote("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : h.somethingWrong);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={h.addPledgeTitle}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5" htmlFor="pledge-amount">
          <span className="label">{h.amount}</span>
          <input id="pledge-amount" inputMode="numeric" className="field text-2xl font-extrabold" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
        </label>
        <div className="flex flex-wrap gap-2">
          {[50, 100, 500, 1000].map((q) => (
            <button key={q} type="button" onClick={() => setAmount(String(q))} className="h-9 border-[1.5px] border-hair px-3 text-sm font-bold hover:border-sky">
              +{q.toLocaleString(locale)}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5" htmlFor="pledge-note">
          <span className="label">{h.note}</span>
          <input id="pledge-note" className="field" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && <p className="m-0 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-ink">{error}</p>}
        <button type="button" onClick={submit} disabled={!n || add.isPending} className="btn-orange h-12 text-base">
          {h.add}
          {n ? ` ${n.toLocaleString(locale)}` : ""}
        </button>
        {(adds ?? []).length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(adds ?? []).slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between text-[13px] font-semibold text-ink-muted">
                <span>
                  +{a.amount.toLocaleString(locale)}
                  {a.note ? ` · ${a.note}` : ""}
                </span>
                <span>{timeAgo(a.created_at, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
