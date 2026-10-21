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

export interface LocalizedText {
  en: string;
  es: string;
}

export interface MediaItem {
  outlet: string;
  title?: string;
  note?: string;
  /** Short editorial summary (our own copy, not a quote from the outlet) —
   * only used by the Digital News & Press cards' Buttah-style layout. */
  description?: LocalizedText;
  url: string;
  type: MediaLinkType;
  /** Social-share preview image, supplied directly by the team — this
   * environment has no outbound internet access to fetch og:image tags
   * itself, so these are hand-sourced rather than scraped. */
  imageUrl?: string;
}

export const digitalNews: MediaItem[] = [
  {
    outlet: "WIPR (Notiséis 360)",
    title: "Puerto Rico logra un récord mundial con más de 1 millón de actos de bondad",
    description: {
      en: "Puerto Rico set a world record with more than one million acts of kindness during the five-day Pásalo Pa'lante campaign, reaching every one of the island's 78 municipalities.",
      es: "Puerto Rico logró un récord mundial con más de un millón de actos de bondad durante los cinco días de la campaña Pásalo Pa'lante, llegando a los 78 municipios de la isla.",
    },
    url: "https://wipr.pr/puerto-rico-logra-un-record-mundial-con-mas-de-1-millon-de-actos-de-bondad/",
    type: "article",
    imageUrl: "https://wipr.pr/wp-content/uploads/2025/12/buenas-e1764698892110.jpg",
  },
  {
    outlet: "Metro Puerto Rico",
    title: "Ola de amor y bondad recorrerá toda la isla",
    note: "Campaign launch, 11/11, Kindness Cards",
    description: {
      en: "Metro PR covered the campaign's November 11th launch and the Kindness Cards initiative encouraging small acts across the island.",
      es: "Metro PR cubrió el lanzamiento de la campaña el 11 de noviembre y la iniciativa de Tarjetas de Bondad que impulsó pequeños actos en toda la isla.",
    },
    url: "https://www.metro.pr/entretenimiento/2025/10/21/ola-de-amor-y-bondad-recorrera-toda-la-isla/",
    type: "article",
    imageUrl: "https://www.metro.pr/api/image/I2UQ5RZ2INE2NKMLYFKIGTBW4E.jpg?w=1200&h=630",
  },
  // This link wasn't loading in the team's own browsers as of 2026-10-21 —
  // worth checking whether the article's still up before relying on it.
  {
    outlet: "WIPR TV",
    title: "Te Amo PR promueve actos de bondad en Puerto Rico",
    description: {
      en: "WIPR TV profiled Te Amo PR's work promoting everyday acts of kindness across Puerto Rico.",
      es: "WIPR TV destacó la labor de Te Amo PR promoviendo actos de bondad cotidianos en Puerto Rico.",
    },
    url: "https://wipr.pr/te-amo-pr-promueve-actos-de-bondad-en-puertorico/",
    type: "article",
  },
  {
    outlet: "WAPA TV",
    title: "Tommy Ramos presenta la campaña Pásalo Pa'lante",
    description: {
      en: "WAPA TV's Tommy Ramos introduced the Pásalo Pa'lante campaign to viewers ahead of the November activation.",
      es: "Tommy Ramos, de WAPA TV, presentó la campaña Pásalo Pa'lante a la audiencia antes de la activación de noviembre.",
    },
    url: "https://wapa.tv/programas/pegate/tommy-ramos-presenta-la-campa-a-p-salo-pa-lante/article_af1de326-c453-46b6-8385-bc55d27e6c5b.html",
    type: "article",
    imageUrl:
      "https://bloximages.newyork1.vip.townnews.com/wapa.tv/content/tncms/assets/v3/editorial/8/9f/89faafb5-ce4d-53e5-8d1b-de74f04b137f/6908de9526b5c.preview.png?crop=1280%2C672%2C0%2C23&resize=1200%2C630&order=crop%2Cresize",
  },
  {
    outlet: "Notiuno",
    // No headline in the source report — derived directly from the URL's
    // own slug ("buscan-r-cord-mundial-con-actos-de-bondad"), not invented.
    title: "Buscan récord mundial con actos de bondad",
    description: {
      en: "Notiuno reported on the push for a world record in acts of kindness across Puerto Rico.",
      es: "Notiuno reportó sobre la búsqueda de un récord mundial en actos de bondad en Puerto Rico.",
    },
    url: "https://www.notiuno.com/noticias/ultimo-minuto/buscan-r-cord-mundial-con-actos-de-bondad/article_3a4de192-87ff-11e9-8974-7bff0c71c5ff.html",
    type: "article",
    imageUrl:
      "https://bloximages.newyork1.vip.townnews.com/notiuno.com/content/tncms/assets/v3/editorial/7/86/7862fdd9-5926-464f-a2e9-6d6f69c94984/68f7bc1d8f473.image.jpg?crop=1600%2C840%2C0%2C81&resize=1200%2C630&order=crop%2Cresize",
  },
  {
    outlet: "Teleonce",
    // Same as Notiuno above — title derived from the URL slug itself.
    title: "Te Amo PR convoca a Puerto Rico a unirse en un día histórico de bondad",
    description: {
      en: "Teleonce covered Te Amo PR's call for Puerto Ricans to take part in a historic day of kindness.",
      es: "Teleonce cubrió el llamado de Te Amo PR a los puertorriqueños a participar en un día histórico de bondad.",
    },
    url: "https://teleonce.com/programas/uncategorized/te-amo-pr-convoca-a-puerto-rico-a-unirse-en-un-dia-historico-de-bondad/",
    type: "article",
    imageUrl: "https://teleonce.com/wp-content/uploads/2025/09/poster-1311.jpg",
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
 *
 * Prefer youtube/spotify items here: this section still renders real
 * embeds (unlike socialCoverage below, reverted to plain link cards after
 * several of its year-old Facebook/Instagram/X posts turned out to be
 * genuinely deleted or privacy-restricted — "Video Unavailable" / "Not
 * found" looked worse than a plain link). A facebook/instagram/x URL
 * picked here risks the same thing.
 */
export const featuredUrls: string[] = [];
