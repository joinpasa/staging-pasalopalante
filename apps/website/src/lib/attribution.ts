// Remembers how a visitor arrived: the campaign tags on the link they clicked (utm_source and the
// rest) or, without tags, the site that sent them. The pledge form sends this along, so the team
// can see which post, email or partner brought each pledge. Nothing personal is kept: only the
// tags written into our own links and a site's name. It is forgotten after 30 days.

const KEY = "pkf-arrived-from";
const DAYS = 30;

export interface Arrival {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  referrer?: string;
  at: string;
}

const clean = (v: string | null, max = 100) => {
  const s = (v ?? "").trim().toLowerCase().replace(/[^\w .:/@+-]/g, "").slice(0, max);
  return s || undefined;
};

function read(): Arrival | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Arrival;
    if (Date.now() - new Date(a.at).getTime() > DAYS * 86_400_000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return a;
  } catch {
    return null;
  }
}

/** Call once when the site loads. A tagged link always wins over a plain visit from another site. */
export function rememberArrival(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const tagged = ["utm_source", "utm_medium", "utm_campaign", "utm_content"].some((k) => p.get(k));
    let referrer: string | undefined;
    try {
      const r = document.referrer ? new URL(document.referrer) : null;
      const own = (h: string) => h === window.location.hostname || /(^|\.)(passkindnessforward|pasalopalante)\.com$/.test(h);
      if (r && !own(r.hostname)) referrer = clean(r.hostname, 200);
    } catch {
      /* an odd referrer is simply ignored */
    }
    if (!tagged && !referrer) return;
    const before = read();
    if (!tagged && before) return;
    const a: Arrival = { source: clean(p.get("utm_source")), medium: clean(p.get("utm_medium")), campaign: clean(p.get("utm_campaign")), content: clean(p.get("utm_content")), referrer, at: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* storage blocked: the pledge still works, it just is not attributed */
  }
}

/** What the pledge form sends with a pledge, or nothing when the visit was not tagged. */
export function arrival(): Omit<Arrival, "at"> | undefined {
  const a = read();
  if (!a) return undefined;
  const { at: _at, ...rest } = a;
  return rest;
}
