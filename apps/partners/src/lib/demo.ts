/*
 * Made-up example data for looking at the Partners Hub locally (npm run dev:partners with
 * VITE_PARTNERS_DEMO=1). Never part of a production build: hub.ts, session.tsx and submissions.ts
 * only import this file behind import.meta.env.DEV. The pictures are plain dev-server paths, so a build
 * never picks them up. Add ?kind=company or ?kind=ambassador to the
 * address to see the other kinds of member, ?logo=1 for a logo, ?logo=square for a logo on a coloured square. The country figures for pledgers are the real totals
 * read on 25 Nov 2026; everything else here is invented for the preview.
 */
const cleanup = "/src/demo-assets/cleanup.jpg";
const friends = "/src/demo-assets/friends.jpg";
const planting = "/src/demo-assets/planting.jpg";
const hands = "/src/demo-assets/hands.jpg";
const kitBadge = "/src/demo-assets/kit-badge.png";
const kitPost = "/src/demo-assets/kit-post.jpg";
const kitStory = "/src/demo-assets/kit-story.jpg";
const kitLinkedin = "/src/demo-assets/kit-linkedin.jpg";
const demoLogo = (() => {
  try {
    const q = new URLSearchParams(window.location.search).get("logo");
    if (q) sessionStorage.setItem("pkf-demo-logo-file", q);
    return sessionStorage.getItem("pkf-demo-logo-file") === "square" ? "/src/demo-assets/logo-square.png" : "/src/demo-assets/logo-demo.png";
  } catch {
    return "/src/demo-assets/logo-demo.png";
  }
})();
import type { FeedRow, KitItem, PledgeAdd, TeamPerson, Update, HubStats, Comment, PartnerEntry } from "./hub";
import type { Submission } from "./submissions";

type DemoKind = "organisation" | "company" | "ambassador";

function demoKind(): DemoKind {
  try {
    const q = new URLSearchParams(window.location.search).get("kind");
    if (q === "company" || q === "ambassador" || q === "organisation") sessionStorage.setItem("pkf-demo-kind", q);
    const s = sessionStorage.getItem("pkf-demo-kind");
    if (s === "company" || s === "ambassador") return s;
  } catch {
    /* ignore */
  }
  return "organisation";
}

const KIND = demoKind();
const WITH_LOGO = (() => {
  try {
    return new URLSearchParams(window.location.search).has("logo") || sessionStorage.getItem("pkf-demo-logo") === "1";
  } catch {
    return false;
  }
})();
try {
  if (WITH_LOGO) sessionStorage.setItem("pkf-demo-logo", "1");
} catch {
  /* ignore */
}
const ME_ID = "00000000-0000-4000-8000-000000000001";
const NAMES: Record<DemoKind, { name: string; orgType: string; city: string; country: string; region: string; person: string }> = {
  organisation: { name: "Escuela Esperanza", orgType: "school", city: "San Juan", country: "Puerto Rico", region: "Metro", person: "Ana Rivera" },
  company: { name: "Isla Coffee Co.", orgType: "company", city: "Ponce", country: "Puerto Rico", region: "South", person: "Luis Ortiz" },
  ambassador: { name: "Maya Cruz", orgType: "ambassador", city: "Cebu", country: "Philippines", region: "Central Visayas", person: "Maya Cruz" },
};
const ME = NAMES[KIND];

export const demoSession = {
  partner: { id: ME_ID, name: ME.name, city: ME.city },
  staff: { id: "00000000-0000-4000-8000-0000000000a1", name: ME.person },
};

const files = new Map<string, string>();
const now = Date.now();
const ago = (h: number) => new Date(now - h * 3_600_000).toISOString();

let profile = {
  id: ME_ID,
  name: ME.name,
  city: ME.city as string | null,
  org_type: ME.orgType as string | null,
  region: null as string | null,
  website: null as string | null,
  instagram: null as string | null,
  facebook: null as string | null,
  linkedin: null as string | null,
  about: null as string | null,
  contact_name: ME.person as string | null,
  logo_path: null as string | null,
  entry_logo_url: (WITH_LOGO ? demoLogo : null) as string | null,
  country: (WITH_LOGO ? ME.country : null) as string | null,
  pledge_goal: KIND === "ambassador" ? 100 : 1000,
  pledge_added: 0,
  pledge_total: KIND === "ambassador" ? 100 : 1000,
  profile_updated_at: null as string | null,
  joined_at: ago(24 * 20),
};

let adds: PledgeAdd[] = [];

const OTHERS = [
  { id: "p-1", name: "Casa Esperanza Youth", org_type: "ngo", country: "Puerto Rico", region: "Bayamón", city: "Bayamón" },
  { id: "p-2", name: "Lagos Kindness Club", org_type: "community", country: "Nigeria", region: "Lagos", city: "Lagos" },
  { id: "p-3", name: "Harbor Bank", org_type: "company", country: "United States", region: "Florida", city: "Miami" },
  { id: "p-4", name: "Lena Weber", org_type: "ambassador", country: "Germany", region: "Bavaria", city: "Munich" },
  { id: "p-5", name: "Colegio Las Brisas", org_type: "school", country: "Puerto Rico", region: "San Juan", city: "San Juan" },
  { id: "p-6", name: "Cebu Youth Network", org_type: "ngo", country: "Philippines", region: "Cebu", city: "Cebu" },
  { id: "p-7", name: "Brightway Software", org_type: "company", country: "India", region: "Karnataka", city: "Bengaluru" },
  { id: "p-8", name: "Priya Nair", org_type: "ambassador", country: "India", region: "Kerala", city: "Kochi" },
  { id: "p-9", name: "Ljubljana Hearts", org_type: "community", country: "Slovenia", region: "Central", city: "Ljubljana" },
  { id: "p-10", name: "Pueblo Verde Municipality", org_type: "government", country: "Puerto Rico", region: "North", city: "Vega Alta" },
  { id: "p-11", name: "James Okafor", org_type: "ambassador", country: "United Kingdom", region: "London", city: "London" },
  { id: "p-12", name: "Accra Friends of Kindness", org_type: "community", country: "Ghana", region: "Greater Accra", city: "Accra" },
];

let posts: FeedRow[] = [
  {
    id: "post-1",
    partner_id: "p-1",
    partner_name: "Casa Esperanza Youth",
    partner_org_type: "ngo",
    partner_country: "Puerto Rico",
    partner_region: "Bayamón",
    partner_city: "Bayamón",
    partner_logo_path: null,
    partner_entry_logo: null,
    staff_name: "Carmen",
    audience: "community",
    kind: "post",
    body: "Our students passed kindness cards to everyone who visited the centre this week. Forty cards, forty small thank-yous.",
    media: [{ path: "demo/hands.jpg", type: "image", name: "hands.jpg" }],
    link_url: null,
    created_at: ago(3),
    used_at: ago(1),
    used_url: "https://www.instagram.com/passkindnessforward/",
    hearts: 24,
    hearted: false,
    comments: 2,
    mine: false,
  },
  {
    id: "post-2",
    partner_id: "p-4",
    partner_name: "Lena Weber",
    partner_org_type: "ambassador",
    partner_country: "Germany",
    partner_region: "Bavaria",
    partner_city: "Munich",
    partner_logo_path: null,
    partner_entry_logo: null,
    staff_name: "Lena Weber",
    audience: "community",
    kind: "testimonial",
    body: "I asked my neighbours to write one thank-you note each. By Sunday our building had a wall of them by the mailboxes. Small acts really do travel.",
    media: [],
    link_url: null,
    created_at: ago(9),
    used_at: null,
    used_url: null,
    hearts: 17,
    hearted: true,
    comments: 1,
    mine: false,
  },
  {
    id: "post-3",
    partner_id: "p-6",
    partner_name: "Cebu Youth Network",
    partner_org_type: "ngo",
    partner_country: "Philippines",
    partner_region: "Cebu",
    partner_city: "Cebu",
    partner_logo_path: null,
    partner_entry_logo: null,
    staff_name: "Joy",
    audience: "community",
    kind: "post",
    body: "Saturday beach clean-up with sixty volunteers. We filled forty bags in two hours.",
    media: [{ path: "demo/cleanup.jpg", type: "image", name: "cleanup.jpg" }],
    link_url: null,
    created_at: ago(26),
    used_at: null,
    used_url: null,
    hearts: 31,
    hearted: false,
    comments: 4,
    mine: false,
  },
  {
    id: "post-4",
    partner_id: "p-7",
    partner_name: "Brightway Software",
    partner_org_type: "company",
    partner_country: "India",
    partner_region: "Karnataka",
    partner_city: "Bengaluru",
    partner_logo_path: null,
    partner_entry_logo: null,
    staff_name: "Arjun",
    audience: "community",
    kind: "post",
    body: "Our team wrote thank-you notes to the people who keep our office running: security, cleaning and the canteen.",
    media: [{ path: "demo/friends.jpg", type: "image", name: "friends.jpg" }],
    link_url: null,
    created_at: ago(50),
    used_at: null,
    used_url: null,
    hearts: 12,
    hearted: false,
    comments: 0,
    mine: false,
  },
  {
    id: "post-5",
    partner_id: "p-5",
    partner_name: "Colegio Las Brisas",
    partner_org_type: "school",
    partner_country: "Puerto Rico",
    partner_region: "San Juan",
    partner_city: "San Juan",
    partner_logo_path: null,
    partner_entry_logo: null,
    staff_name: "Profesora Díaz",
    audience: "community",
    kind: "post",
    body: "Los estudiantes de cuarto grado sembraron doce árboles frente a la escuela.",
    media: [{ path: "demo/planting.jpg", type: "image", name: "planting.jpg" }],
    link_url: null,
    created_at: ago(80),
    used_at: null,
    used_url: null,
    hearts: 40,
    hearted: false,
    comments: 3,
    mine: false,
  },
];

const commentsByPost = new Map<string, Comment[]>([
  [
    "post-1",
    [
      { id: "c1", body: "Love seeing those cards passed from one person to another.", created_at: ago(2), author: "Lena Weber", partner_name: "Lena Weber", team: false, mine: false },
      { id: "c2", body: "Thank you for this. We shared it on our Instagram today.", created_at: ago(1), author: "Kindness Forward", partner_name: "Kindness Forward", team: true, mine: false },
    ],
  ],
]);

const DEMO_FILES: Record<string, string> = {
  "demo/cleanup.jpg": cleanup,
  "demo/friends.jpg": friends,
  "demo/planting.jpg": planting,
  "demo/hands.jpg": hands,
};

const updates: Update[] = [
  {
    id: "u-2",
    week_start: "2026-11-23",
    title: "Gratitude week",
    title_es: "Semana de la gratitud",
    intro: "Welcome to the Partners Hub. Each Monday you'll find what's new in your kit, one simple ask, and news from the movement here.",
    intro_es: "Bienvenidos al Partners Hub. Cada lunes encontrarás aquí lo nuevo en tu kit, una petición sencilla y noticias del movimiento.",
    items: [
      { kind: "kit", text: "New in your kit: a thank-you story frame in English and Spanish.", textEs: "Nuevo en tu kit: un marco de historia de agradecimiento en inglés y español." },
      { kind: "ask", text: "This week's ask: show us one thank-you from your team. Post it on Home.", textEs: "La petición de esta semana: muéstranos un gracias de tu equipo. Publícalo en Inicio." },
      { kind: "news", text: "More than 1.1 million pledges, recognised by Official World Record.", textEs: "Más de 1.1 millones de compromisos, reconocidos por Official World Record." },
      { kind: "moment", text: "Coming up: 21 December, the season's second global moment.", textEs: "Se acerca: 21 de diciembre, el segundo momento global de la temporada." },
    ],
    spotlight_partner_id: "p-1",
    spotlight_text: "Casa Esperanza Youth met with the Pásalo Pa'lante team this week to bring kindness cards to every one of their four centres.",
    spotlight_text_es: "Casa Esperanza Youth se reunió con el equipo de Pásalo Pa'lante para llevar tarjetas de bondad a sus cuatro centros.",
    image_path: null,
    published_at: ago(30),
  },
  {
    id: "u-1",
    week_start: "2026-11-16",
    title: "Children's week",
    title_es: "Semana de la niñez",
    intro: "A week for the youngest members of the movement.",
    intro_es: "Una semana para los más jóvenes del movimiento.",
    items: [{ kind: "ask", text: "Ask the children in your community: who are your toys for?", textEs: "Pregúntale a los niños de tu comunidad: ¿para quién son tus juguetes?" }],
    spotlight_partner_id: null,
    spotlight_text: null,
    spotlight_text_es: null,
    image_path: null,
    published_at: ago(24 * 8),
  },
];

const kit: KitItem[] = [
  { id: "k1", title: "Start here", title_es: "Empieza aquí", description: "Two pages: what's in the kit and how to use it in three steps.", description_es: "Dos páginas: qué hay en el kit y cómo usarlo en tres pasos.", section: "start", audience: "all", lang: "both", file_path: null, thumb_path: kitPost, url: "https://example.org/start-here.pdf", mime: "application/pdf", size_bytes: 820000, width: null, height: null, caption: null, caption_es: null, sort: 1, added_at: ago(24 * 6) },
  { id: "k2", title: "Proud partner badge", title_es: "Insignia de organización aliada", description: "For your website, email footer and slides.", description_es: "Para tu web, tu firma de correo y tus presentaciones.", section: "social", audience: "organisation", lang: "en", file_path: null, thumb_path: kitBadge, url: kitBadge, mime: "image/png", size_bytes: 120000, width: 1200, height: 360, caption: null, caption_es: null, sort: 10, added_at: ago(24 * 6) },
  { id: "k3", title: "Announcement post", title_es: "Publicación de anuncio", description: "A ready post for Instagram, Facebook and LinkedIn.", description_es: "Una publicación lista para Instagram, Facebook y LinkedIn.", section: "social", audience: "all", lang: "en", file_path: null, thumb_path: kitPost, url: kitPost, mime: "image/jpeg", size_bytes: 300000, width: 1080, height: 1350, caption: "We're proud to be part of Kindness Forward this Global Kindness Season. Together we're working toward 1 billion acts of kindness. Join us at passkindnessforward.com #PassKindnessForward", caption_es: "Nos enorgullece ser parte de Kindness Forward esta Temporada Global de Bondad. Juntos vamos rumbo a mil millones de actos de bondad. Únete en pasalopalante.com #PasaloPalante", sort: 11, added_at: ago(24 * 3) },
  { id: "k4", title: "Thank-you story frame", title_es: "Marco de historia de agradecimiento", description: "Add your own photo and post it as a story.", description_es: "Añade tu foto y publícala como historia.", section: "social", audience: "all", lang: "both", file_path: null, thumb_path: kitStory, url: kitStory, mime: "image/jpeg", size_bytes: 400000, width: 1080, height: 1920, caption: null, caption_es: null, sort: 12, added_at: ago(30) },
  { id: "k5", title: "LinkedIn banner", title_es: "Portada de LinkedIn", description: "For your organisation's page or your own profile.", description_es: "Para la página de tu organización o tu perfil.", section: "profile", audience: "all", lang: "en", file_path: null, thumb_path: kitLinkedin, url: kitLinkedin, mime: "image/jpeg", size_bytes: 200000, width: 1584, height: 396, caption: null, caption_es: null, sort: 20, added_at: ago(24 * 6) },
  { id: "k6", title: "Company sign-up kit", title_es: "Kit para empresas", description: "Staff email, office poster, slide and 12 workplace kindness acts.", description_es: "Correo para el personal, afiche, diapositiva y 12 actos de bondad en el trabajo.", section: "start", audience: "company", lang: "en", file_path: null, thumb_path: kitPost, url: "https://example.org/company-kit.zip", mime: "application/zip", size_bytes: 24000000, width: null, height: null, caption: null, caption_es: null, sort: 2, added_at: ago(24 * 2) },
  { id: "k7", title: "Ambassador guide", title_es: "Guía para embajadores", description: "How to bring your circle into the movement, in one page.", description_es: "Cómo sumar a tu círculo al movimiento, en una página.", section: "start", audience: "ambassador", lang: "both", file_path: null, thumb_path: kitPost, url: "https://example.org/ambassador-guide.pdf", mime: "application/pdf", size_bytes: 900000, width: null, height: null, caption: null, caption_es: null, sort: 3, added_at: ago(24 * 2) },
  { id: "k8", title: "Office poster with QR code", title_es: "Afiche con código QR", description: "Letter and A4. The QR code opens the pledge page.", description_es: "Carta y A4. El código QR abre la página del compromiso.", section: "print", audience: "all", lang: "en", file_path: null, thumb_path: kitPost, url: "https://example.org/poster.pdf", mime: "application/pdf", size_bytes: 1500000, width: null, height: null, caption: null, caption_es: null, sort: 30, added_at: ago(24 * 10) },
  { id: "k9", title: "Email signature", title_es: "Firma de correo", description: "Paste it under your name.", description_es: "Pégala debajo de tu nombre.", section: "email", audience: "all", lang: "en", file_path: null, thumb_path: kitBadge, url: kitBadge, mime: "image/png", size_bytes: 60000, width: 1200, height: 300, caption: null, caption_es: null, sort: 40, added_at: ago(24 * 10) },
];

const PLEDGERS = [
  ["United States", 233], ["Germany", 82], ["United Kingdom", 62], ["India", 47], ["Slovenia", 40], ["Nigeria", 35], ["Puerto Rico", 33],
  ["Philippines", 26], ["Canada", 21], ["Brazil", 16], ["Australia", 13], ["Mexico", 11], ["Ghana", 9], ["Kenya", 8], ["South Africa", 7],
  ["Spain", 7], ["France", 6], ["Italy", 6], ["Netherlands", 5], ["Ireland", 5], ["Pakistan", 4], ["Colombia", 4], ["Jamaica", 3], ["Singapore", 3],
] as const;

const submissions: Submission[] = [
  { id: "s1", description: "Thank-you cards for the cafeteria staff", people_count: 120, act_date: "2026-11-20", status: "approved", review_note: null, media: [], link_url: null, created_at: ago(100), thumbUrl: hands },
  { id: "s2", description: "Food drive for the shelter on Calle Loíza", people_count: 85, act_date: "2026-11-18", status: "pending", review_note: null, media: [], link_url: null, created_at: ago(140), thumbUrl: null },
  { id: "s3", description: "Reading buddies with the first graders", people_count: 107, act_date: "2026-11-12", status: "approved", review_note: null, media: [], link_url: null, created_at: ago(300), thumbUrl: planting },
];

export const demo = {
  fileUrl: (path: string) => files.get(path) ?? DEMO_FILES[path] ?? path,
  keepFile: (path: string, blob: Blob) => {
    files.set(path, URL.createObjectURL(blob));
    return path;
  },
  me: () => ({ ...profile, pledge_total: profile.pledge_goal + profile.pledge_added }),
  saveProfile: (a: Record<string, unknown>) => {
    profile = {
      ...profile,
      city: (a._city as string) || null,
      country: (a._country as string) || null,
      region: (a._region as string) || null,
      org_type: (a._org_type as string) || profile.org_type,
      website: (a._website as string) || null,
      instagram: (a._instagram as string) || null,
      facebook: (a._facebook as string) || null,
      linkedin: (a._linkedin as string) || null,
      about: (a._about as string) || null,
      contact_name: (a._contact_name as string) || null,
      logo_path: a._logo_path === null ? profile.logo_path : (a._logo_path as string) || null,
      profile_updated_at: new Date().toISOString(),
    };
  },
  pledgeAdds: () => adds,
  addPledge: (amount: number, note: string) => {
    adds = [{ id: `a${adds.length + 1}`, amount, note: note || null, counted_at: null, created_at: new Date().toISOString() }, ...adds];
    profile.pledge_added += amount;
    return profile.pledge_goal + profile.pledge_added;
  },
  team: (): TeamPerson[] =>
    KIND === "ambassador"
      ? [{ id: "t1", name: ME.person, last_login_at: ago(1), created_at: ago(24 * 20) }]
      : [
          { id: "t1", name: ME.person, last_login_at: ago(1), created_at: ago(24 * 20) },
          { id: "t2", name: "Pedro Santiago", last_login_at: ago(30), created_at: ago(24 * 12) },
          { id: "t3", name: "Lucía Méndez", last_login_at: null, created_at: ago(24 * 2) },
        ],
  feed: () => posts.map((p) => ({ ...p })),
  createPost: (a: Record<string, unknown>) => {
    const id = `post-${Date.now()}`;
    posts = [
      {
        id,
        partner_id: ME_ID,
        partner_name: profile.name,
        partner_org_type: profile.org_type,
        partner_country: profile.country,
        partner_region: profile.region,
        partner_city: profile.city,
        partner_logo_path: profile.logo_path,
        partner_entry_logo: null,
        staff_name: ME.person,
        audience: a._audience as "community" | "team",
        kind: a._kind as "post",
        body: String(a._body ?? ""),
        media: (a._media as FeedRow["media"]) ?? [],
        link_url: null,
        created_at: new Date().toISOString(),
        used_at: null,
        used_url: null,
        hearts: 0,
        hearted: false,
        comments: 0,
        mine: true,
      },
      ...posts,
    ];
    return id;
  },
  deletePost: (id: string) => {
    posts = posts.filter((p) => p.id !== id);
  },
  heart: (id: string) => {
    const p = posts.find((x) => x.id === id)!;
    p.hearted = !p.hearted;
    p.hearts += p.hearted ? 1 : -1;
    return { hearted: p.hearted, hearts: p.hearts };
  },
  comments: (id: string) => commentsByPost.get(id) ?? [],
  addComment: (id: string, body: string) => {
    const list = commentsByPost.get(id) ?? [];
    list.push({ id: `c${Date.now()}`, body, created_at: new Date().toISOString(), author: ME.person, partner_name: profile.name, team: false, mine: true });
    commentsByPost.set(id, list);
    const p = posts.find((x) => x.id === id);
    if (p) p.comments = list.length;
    return "ok";
  },
  deleteComment: (postId: string, id: string) => {
    const list = (commentsByPost.get(postId) ?? []).filter((c) => c.id !== id);
    commentsByPost.set(postId, list);
    const p = posts.find((x) => x.id === postId);
    if (p) p.comments = list.length;
  },
  updates: () => updates,
  card: (id: string) => {
    const o = OTHERS.find((x) => x.id === id);
    return o
      ? [{ id: o.id, name: o.name, org_type: o.org_type, country: o.country, region: o.region, city: o.city, logo_path: null, entry_logo_url: null, about: null, website: "https://example.org" }]
      : [];
  },
  // the real kit when a copy of the live list is saved in demo-assets/kit-live.json (git-ignored)
  kit: async (): Promise<KitItem[]> => {
    try {
      const r = await fetch("/src/demo-assets/kit-live.json");
      if (r.ok) return (await r.json()) as KitItem[];
    } catch {
      /* fall back to the examples */
    }
    return kit;
  },
  stats: (): HubStats => ({
    pledgers: PLEDGERS.map(([country, people]) => ({ country, people })),
    partners: [
      ...OTHERS.map((o, i) => ({ id: o.id, name: o.name, orgType: o.org_type, country: o.country, region: o.region, city: o.city, logoPath: null, entryLogo: null, acts: 40 + i * 37, joined: true })),
      { id: ME_ID, name: profile.name, orgType: profile.org_type, country: profile.country, region: profile.region, city: profile.city, logoPath: profile.logo_path, entryLogo: null, acts: 312, joined: true },
    ],
    actsLogged: 2140,
    posts: posts.length,
    listedPartners: 144,
    pledgedActs: 38911183,
  }),
  // the real partners list when a copy is saved in demo-assets/entries-live.json (git-ignored)
  entries: async (): Promise<PartnerEntry[]> => {
    try {
      const r = await fetch("/src/demo-assets/entries-live.json");
      if (r.ok) return (await r.json()) as PartnerEntry[];
    } catch {
      /* fall back to the examples */
    }
    return [
      { id: "e1", category: "Nonprofits", name: "Comedores del Barrio", logo_url: null, website: null, role: null, featured: false, founding: true, sort_order: 1 },
      { id: "e2", category: "Education", name: "Colegio del Mar", logo_url: null, website: null, role: null, featured: false, founding: false, sort_order: 2 },
      { id: "e3", category: "Corporate", name: "Brisa Bank", logo_url: null, website: null, role: null, featured: false, founding: false, sort_order: 3 },
      { id: "e4", category: "Government", name: "Municipio de Ejemplo", logo_url: null, website: null, role: "Mayor: Example Name", featured: false, founding: false, sort_order: 4 },
      { id: "e5", category: "Media & Press", name: "Radio Bondad", logo_url: null, website: null, role: null, featured: false, founding: false, sort_order: 5 },
    ];
  },
  submissions: () => submissions,
  recentPledges: () => [
    { created_at: ago(0.05), country: "Germany", kind: "person" as const, org_name: null, acts: 12 },
    { created_at: ago(0.3), country: "Puerto Rico", kind: "organisation" as const, org_name: "Casa Esperanza Youth", acts: 5000 },
    { created_at: ago(0.9), country: "Nigeria", kind: "person" as const, org_name: null, acts: 30 },
    { created_at: ago(1.6), country: "Philippines", kind: "person" as const, org_name: null, acts: 7 },
    { created_at: ago(2.2), country: "United States", kind: "person" as const, org_name: null, acts: 100 },
    { created_at: ago(3.5), country: "India", kind: "organisation" as const, org_name: null, acts: 400 },
  ],
};
