// 2025 Pásalo Pa'lante press coverage (campaign period Nov 7–11, 2025),
// sourced from the team's "Publicity & Earned Media Report". Shown on
// /media, which is served on both pasalopalante.com and
// passkindnessforward.com (same build — see apps/website/index.html's
// per-hostname gtag note) since Pass Kindness Forward shares this record
// too, even though the coverage itself is Puerto Rico–specific.
//
// Several links have no real headline in the source report — "title" is
// left undefined for those rather than inventing one; the page shows just
// the outlet/platform in that case. Not exhaustive: the report itself
// notes other clips, reposts, and international pickup aren't included.

export type MediaLinkType =
  | "article"
  | "youtube"
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "spotify";

export interface MediaItem {
  outlet: string;
  title?: string;
  note?: string;
  url: string;
  type: MediaLinkType;
}

export const digitalNews: MediaItem[] = [
  {
    outlet: "WIPR (Notiséis 360)",
    title: "Puerto Rico logra un récord mundial con más de 1 millón de actos de bondad",
    url: "https://wipr.pr/puerto-rico-logra-un-record-mundial-con-mas-de-1-millon-de-actos-de-bondad/",
    type: "article",
  },
  {
    outlet: "Metro Puerto Rico",
    title: "Ola de amor y bondad recorrerá toda la isla",
    note: "Campaign launch, 11/11, Kindness Cards",
    url: "https://www.metro.pr/entretenimiento/2025/10/21/ola-de-amor-y-bondad-recorrera-toda-la-isla/",
    type: "article",
  },
  {
    outlet: "WIPR TV",
    title: "Te Amo PR promueve actos de bondad en Puerto Rico",
    url: "https://wipr.pr/te-amo-pr-promueve-actos-de-bondad-en-puertorico/",
    type: "article",
  },
  {
    outlet: "WAPA TV",
    title: "Tommy Ramos presenta la campaña Pásalo Pa'lante",
    url: "https://wapa.tv/programas/pegate/tommy-ramos-presenta-la-campa-a-p-salo-pa-lante/article_af1de326-c453-46b6-8385-bc55d27e6c5b.html",
    type: "article",
  },
  {
    outlet: "Notiuno",
    url: "https://www.notiuno.com/noticias/ultimo-minuto/buscan-r-cord-mundial-con-actos-de-bondad/article_3a4de192-87ff-11e9-8974-7bff0c71c5ff.html",
    type: "article",
  },
  {
    outlet: "Teleonce",
    url: "https://teleonce.com/programas/uncategorized/te-amo-pr-convoca-a-puerto-rico-a-unirse-en-un-dia-historico-de-bondad/",
    type: "article",
  },
];

export const videoAndPodcast: MediaItem[] = [
  {
    outlet: "Para Servirle Podcast",
    title: "Buscan lograr 1,000,000 actos de bondad",
    note: "Interview with Javier De Nardo",
    url: "https://www.youtube.com/watch?v=PAhOrMKwQ4M",
    type: "youtube",
  },
  {
    outlet: "WIPR",
    title: "“Te Amo PR” promotes acts of kindness in Puerto Rico",
    url: "https://www.youtube.com/watch?v=-tnjbAAljVA",
    type: "youtube",
  },
  {
    outlet: "Javier DeNardo Interview",
    note: "Live interview — relevant part starts 18 minutes in",
    url: "https://www.youtube.com/live/jl8laVX52fY",
    type: "youtube",
  },
  {
    outlet: "Para Servirle PR (Spotify)",
    title: "Episodio #196-T5 Javier DeNardo | Te Amo PR",
    url: "https://open.spotify.com/episode/4bmepMDVlTHMf4w87U7wJY",
    type: "spotify",
  },
  {
    outlet: "YouTube",
    url: "https://youtu.be/5O53JnLee8A",
    type: "youtube",
  },
  {
    outlet: "YouTube",
    url: "https://www.youtube.com/watch?v=4xuM7zWZPdE",
    type: "youtube",
  },
];

export const socialCoverage: MediaItem[] = [
  {
    outlet: "Facebook reel",
    url: "https://www.facebook.com/reel/1841083463449459",
    type: "facebook",
  },
  {
    outlet: "Noticias RTZ (Facebook)",
    url: "https://www.facebook.com/noticiasrtz/posts/movimiento-p%C3%A1salo-palante-busca-r%C3%A9cord-mundial-con-su-campa%C3%B1a-de-actos-de-bondad/1209608357885849/",
    type: "facebook",
  },
  {
    outlet: "Notiséis WIPR (X)",
    url: "https://x.com/notiseiswipr/status/1980760378997928292",
    type: "x",
  },
  {
    outlet: "Notiséis WIPR (X)",
    note: "Second post",
    url: "https://x.com/notiseiswipr/status/1985500727775539539",
    type: "x",
  },
  {
    outlet: "Instagram reel",
    url: "https://www.instagram.com/reel/DQFoXSeCq02/",
    type: "instagram",
  },
  {
    outlet: "WIPR TV (Instagram reel)",
    url: "https://www.instagram.com/reel/DQnSwM9Ci3F/",
    type: "instagram",
  },
  {
    outlet: "Facebook post",
    url: "https://www.facebook.com/share/p/1CFNyJnTgn/",
    type: "facebook",
  },
  {
    outlet: "Facebook video",
    url: "https://www.facebook.com/share/v/1CZPeS9Jn6/",
    type: "facebook",
  },
  {
    outlet: "WIPR TV (Facebook video)",
    url: "https://www.facebook.com/share/v/16Ufuob5Up/",
    type: "facebook",
  },
  {
    outlet: "WIPR TV (LinkedIn)",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:7391264750606684160",
    type: "linkedin",
  },
  {
    outlet: "WAPA TV — Pégate al Mediodía (Facebook)",
    url: "https://www.facebook.com/100044290938090/posts/1370537407765944/",
    type: "facebook",
  },
  {
    outlet: "Pelota Dura (Instagram reel)",
    note: "Interview with Chin",
    url: "https://www.instagram.com/reels/DPVFvJTjBsg/",
    type: "instagram",
  },
  {
    outlet: "La X (Facebook reel)",
    url: "https://www.facebook.com/reel/1162127786108335",
    type: "facebook",
  },
  {
    outlet: "La X (Facebook reel)",
    url: "https://www.facebook.com/reel/1355250082778830",
    type: "facebook",
  },
  {
    outlet: "Monika Candelaria (Facebook)",
    title: "Una mirada a lo positivo llegó a Puerto Rico",
    url: "https://www.facebook.com/monikacandelariaperiodista/posts/una-mirada-a-lo-positivo-lleg%C3%B3-a-puerto-rico-y-se-enamor%C3%B3-de-nuestra-isla-as%C3%AD-na/1401780394646563/",
    type: "facebook",
  },
];

/** Named outlets with no specific article/clip link — shown as plain chips. */
export const broadcastOutlets: string[] = [
  "WIPR Radio & TV",
  "Telemundo",
  "WAPA TV",
  "Teleonce",
  "Regional radio stations across the island",
];

export const otherOutletsReached: string[] = [
  "Viva la Mañana – Inspira",
  "Waba Radio – Aguadilla",
  "Radio Gritos – Lares",
  "Radio Universidad",
  "Hoy Día Puerto Rico – Telemundo",
  "El Circo de la Mega",
  "Conoce sobre Salud – WIPR Radio",
  "El Poder del Pueblo – Teleonce",
  "Noticentro al Amanecer – WAPA TV",
  "La Calle Digital",
];

export const mediaSummary = {
  impressions: 12500000,
  earnedMediaValue: 225000,
  placementCount:
    digitalNews.length + videoAndPodcast.length + socialCoverage.length,
};

/**
 * URLs (must match an item's `url` in videoAndPodcast or socialCoverage
 * exactly) to spotlight in the "Featured" section at the top of the page.
 * Empty until the team picks which ones — the section hides itself while
 * this is empty, nothing to do on the page side when this fills in.
 */
export const featuredUrls: string[] = [];
