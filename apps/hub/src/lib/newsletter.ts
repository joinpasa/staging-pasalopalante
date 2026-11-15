// The newsletter designer's engine: a design made of blocks becomes email-safe HTML, in English
// for Kindness Forward and in Spanish for Pásalo Pa'lante. The HTML follows the newsletters the
// team already sends from HighLevel (Montserrat with Arial behind it, 600 pixels wide, HighLevel's
// own merge tags), so it can be saved there as a template and sent from there.

import { slug, tagged } from "./links";
import type { Item, NewsletterBlock, NewsletterDesign } from "./types";

export type Lang = "en" | "es";

/** The official logos the sent newsletters already use, by language. */
export const LOGO: Record<Lang, { url: string; alt: string; width: number }> = {
  en: { url: "https://assets.cdn.filesafe.space/LKWlTUbJwER3Aj9HbawG/media/6ae37b408201162be97f9ffc.png", alt: "Pass Kindness Forward", width: 150 },
  es: { url: "https://passkindnessforward.com/logo-PPL.png", alt: "Pásalo Pa'lante", width: 130 },
};

export const SENDER: Record<Lang, { name: string; email: string }> = {
  // {{business.email}} is what the 10 November newsletter used: HighLevel fills in team@mg.passkindnessforward.com
  en: { name: "Team Pass Kindness Forward", email: "{{business.email}}" },
  es: { name: "Pásalo Pa'lante x Te Amo PR", email: "team@mg.pasalopalante.com" },
};

const SITE: Record<Lang, string> = { en: "https://passkindnessforward.com", es: "https://pasalopalante.com" };

const C = { navy: "#0e234b", sky: "#00a3e0", orange: "#f37023", gold: "#fdb813", magenta: "#d81b60", paper: "#f7f5f0", muted: "#586176", line: "#e4e1d9", goldSoft: "#fff1cc" };
const FONT = "Montserrat,Arial,sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Paragraphs and line breaks, with {{contact.first_name}} and other merge tags left as they are. */
const prose = (s: string) =>
  esc(s.trim())
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, "<br>"))
    .join(`</p><p style="margin:16px 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.navy};">`);

const blockText = (b: NewsletterBlock, lang: Lang): string => ("en" in b ? (lang === "en" ? b.en : b.es) : "");

function block(b: NewsletterBlock, lang: Lang, campaign: string): string {
  const t = blockText(b, lang);
  switch (b.type) {
    case "heading":
      return `<h1 style="margin:28px 0 0;font-family:${FONT};font-size:26px;line-height:1.2;font-weight:800;color:${C.navy};">${esc(t)}</h1>`;
    case "text":
      return `<p style="margin:16px 0 0;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.navy};">${prose(t)}</p>`;
    case "act":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse;"><tr><td style="background:${C.goldSoft};border-left:6px solid ${C.gold};padding:18px 20px;border-radius:8px;">
<p style="margin:0;font-family:${FONT};font-size:13px;font-weight:700;color:${C.muted};">${lang === "en" ? "This week's act" : "El acto de esta semana"}</p>
<p style="margin:6px 0 0;font-family:${FONT};font-size:19px;line-height:1.35;font-weight:800;color:${C.navy};">${esc(t)}</p></td></tr></table>`;
    case "quote":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse;"><tr><td style="border-left:4px solid ${C.sky};padding:4px 0 4px 18px;">
<p style="margin:0;font-family:${FONT};font-size:18px;line-height:1.5;font-weight:600;color:${C.navy};">${prose(t)}</p>${b.who ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:14px;color:${C.muted};">${esc(b.who)}</p>` : ""}</td></tr></table>`;
    case "number":
      return `<p style="margin:28px 0 0;font-family:${FONT};font-size:40px;line-height:1;font-weight:800;color:${C.magenta};">${esc(b.value)}</p><p style="margin:8px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.muted};">${esc(t)}</p>`;
    case "image":
      return b.url ? `<img src="${esc(b.url)}" width="504" alt="${esc(b.alt)}" style="display:block;width:100%;max-width:504px;height:auto;margin:24px 0 0;border:0;border-radius:10px;">` : "";
    case "button": {
      // our own links carry the email's name, so a pledge from it is counted under the email
      const href = tagged(lang === "es" && b.urlEs ? b.urlEs : b.url, { source: "newsletter", medium: "email", campaign, content: lang });
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:collapse;"><tr><td style="background:${C.navy};border-radius:10px;">
<a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(t)}</a></td></tr></table>`;
    }
    case "divider":
      return `<hr style="margin:28px 0 0;border:0;border-top:1px solid ${C.line};">`;
  }
}

/** The name an email's links carry, from its English subject. */
const campaignOf = (d: NewsletterDesign) => slug(d.subject.en || d.subject.es || "newsletter");

/** The whole email, ready to paste into HighLevel or save there as a template. */
export function renderNewsletter(d: NewsletterDesign, lang: Lang): string {
  const logo = LOGO[lang];
  const foot =
    lang === "en"
      ? { line: "Kindness Forward is the movement. Pass Kindness Forward is how we live it.", why: "You are receiving this because you made a kindness pledge.", leave: "Unsubscribe" }
      : { line: "Pásalo Pa'lante, con Te Amo PR, es parte de Kindness Forward.", why: "Recibes este correo porque hiciste una promesa de bondad.", leave: "Darte de baja" };
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.subject[lang])}</title>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(d.preview[lang])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};border-collapse:collapse;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;border-collapse:separate;border-top:6px solid ${lang === "en" ? C.sky : C.orange};">
<tr><td style="padding:32px 48px 40px;">
<img src="${logo.url}" width="${logo.width}" alt="${esc(logo.alt)}" style="display:block;border:0;height:auto;">
${d.blocks.map((b) => block(b, lang, campaignOf(d))).join("\n")}
</td></tr></table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;"><tr><td style="padding:22px 48px;text-align:center;">
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">${esc(foot.line)}</p>
<p style="margin:6px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};"><a href="${tagged(SITE[lang], { source: "newsletter", medium: "email", campaign: campaignOf(d), content: "footer" })}" style="color:${C.navy};font-weight:700;">${SITE[lang].replace("https://", "")}</a></p>
<p style="margin:12px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">${esc(foot.why)} <a href="{{email.unsubscribe_link}}" style="color:${C.muted};">${foot.leave}</a></p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

let n = 0;
export const blockId = () => `b${Date.now().toString(36)}${(n++).toString(36)}`;

/** A new block of a kind, with empty words to fill in. */
export function newBlock(type: NewsletterBlock["type"]): NewsletterBlock {
  const id = blockId();
  switch (type) {
    case "heading":
    case "text":
    case "act":
      return { id, type, en: "", es: "" };
    case "quote":
      return { id, type, en: "", es: "", who: "" };
    case "number":
      return { id, type, value: "", en: "", es: "" };
    case "image":
      return { id, type, url: "", alt: "" };
    case "button":
      return { id, type, en: "Make your pledge", es: "Haz tu promesa", url: `${SITE.en}/commit`, urlEs: `${SITE.es}/commit` };
    case "divider":
      return { id, type };
  }
}

export const BLOCK_LABEL: Record<NewsletterBlock["type"], string> = {
  heading: "Heading",
  text: "Paragraph",
  act: "This week's act",
  quote: "A real story or quote",
  number: "One number",
  image: "Picture",
  button: "Button",
  divider: "Line",
};

/** A first design for an email card, from what the card already says. */
export function starterDesign(item: Pick<Item, "title" | "subject" | "captionEn" | "captionEs">): NewsletterDesign {
  const subject = item.subject || item.title;
  const firstLine = (s: string) => s.split(/\n/)[0]?.replace(/^.*?:\s*/, "").trim() ?? "";
  return {
    subject: { en: subject, es: "" },
    preview: { en: "", es: "" },
    fromName: { en: SENDER.en.name, es: SENDER.es.name },
    fromEmail: { en: SENDER.en.email, es: SENDER.es.email },
    blocks: [
      { id: blockId(), type: "heading", en: "Hi {{contact.first_name}},", es: "Hola, {{contact.first_name}}:" },
      { id: blockId(), type: "act", en: firstLine(item.captionEn), es: firstLine(item.captionEs) },
      { id: blockId(), type: "text", en: item.captionEn.split(/\n{2,}/).slice(1).join("\n\n"), es: item.captionEs.split(/\n{2,}/).slice(1).join("\n\n") },
      newBlock("button"),
    ],
  };
}

/** Everything a reader will see, for the wording checks. */
export function designText(d: NewsletterDesign, lang: Lang): string {
  return [d.subject[lang], d.preview[lang], ...d.blocks.map((b) => [blockText(b, lang), b.type === "quote" ? b.who : "", b.type === "number" ? b.value : ""].join(" "))].join("\n");
}
