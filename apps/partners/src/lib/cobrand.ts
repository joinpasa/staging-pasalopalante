import type { Kind } from "./kinds";

/**
 * "Made for you": ready pictures drawn in the browser from the member's own logo and, if they add
 * one, their own photo, next to the official Kindness Forward (or, in Spanish, Pásalo Pa'lante)
 * logo and the official profile frames. The official artwork is drawn exactly as supplied, never
 * redrawn, and words never sit on the photo. Nothing is uploaded: the photo stays on the device.
 */
export type CobrandFormat = "post" | "story" | "badge" | "banner" | "announcePost" | "announceStory" | "framePost" | "frameStory" | "profile";

export const FORMATS: Record<CobrandFormat, { w: number; h: number; en: string; es: string }> = {
  post: { w: 1080, h: 1350, en: "Post", es: "Publicación" },
  story: { w: 1080, h: 1920, en: "Story", es: "Historia" },
  badge: { w: 1200, h: 400, en: "Badge for your website and email", es: "Insignia para tu web y correo" },
  banner: { w: 1584, h: 396, en: "LinkedIn banner", es: "Portada de LinkedIn" },
  announcePost: { w: 1080, h: 1350, en: "Announcement post", es: "Publicación de anuncio" },
  announceStory: { w: 1080, h: 1920, en: "Announcement story", es: "Historia de anuncio" },
  framePost: { w: 1080, h: 1350, en: "Photo frame post", es: "Publicación con marco" },
  frameStory: { w: 1080, h: 1920, en: "Photo frame story", es: "Historia con marco" },
  profile: { w: 1080, h: 1080, en: "Profile picture with our frame", es: "Foto de perfil con nuestro marco" },
};

/** Which pictures need the logo, and which the photo. */
export const LOGO_FORMATS: CobrandFormat[] = ["post", "story", "badge", "banner"];
export const PHOTO_FORMATS: CobrandFormat[] = ["announcePost", "announceStory", "framePost", "frameStory", "profile"];
/** An ambassador is one person, so the "we've joined" announcement isn't theirs; the frames are. */
export const PHOTO_FORMATS_SOLO: CobrandFormat[] = ["framePost", "frameStory", "profile"];

/**
 * The official templates with a see-through photo area, and where that area is. The announcement
 * post and story are the partner kit's, re-rendered by partner-kit/photo_templates.py; the frames
 * are the get-to-know kit's "Share it" frames.
 */
const PHOTO_TEMPLATES: Partial<Record<CobrandFormat, { file: (lang: "en" | "es") => string; window: [number, number, number, number]; focus: number }>> = {
  announcePost: { file: (l) => `/hub/announce-post-${l}.png`, window: [0, 0, 1080, 760], focus: 0.4 },
  announceStory: { file: (l) => `/hub/announce-story-${l}.png`, window: [0, 0, 1080, 1240], focus: 0.35 },
  framePost: { file: (l) => `/hub/frame-post-${l}.png`, window: [0, 0, 1080, 1028], focus: 0.4 },
  frameStory: { file: (l) => `/hub/frame-story-${l}.png`, window: [0, 0, 1080, 1318], focus: 0.35 },
};

function frameFor(kind: Kind, lang: "en" | "es") {
  if (kind === "ambassador") return "/hub/frame-ambassador-en.png";
  return lang === "es" ? "/hub/frame-partner-es.png" : "/hub/frame-partner-en.png";
}

const NAVY = "#0e234b";
const MAGENTA = "#d81b60";
const CORAL = "#f7583e";
const INK2 = "#33415e";

function line1(kind: Kind, lang: "en" | "es") {
  if (lang === "es") return kind === "ambassador" ? "Soy embajador/a de" : kind === "company" ? "Nuestra empresa es parte de" : "Somos parte de";
  return kind === "ambassador" ? "I'm an ambassador for" : kind === "company" ? "Our company is part of" : "We're part of";
}

function brandLines(lang: "en" | "es"): [string, string] {
  return lang === "es" ? ["Pásalo", "Pa'lante"] : ["Kindness", "Forward"];
}

function season(lang: "en" | "es") {
  return lang === "es" ? "Temporada Global de Bondad · 1 nov – 31 ene" : "Global Kindness Season · 1 Nov – 31 Jan";
}

function site(lang: "en" | "es") {
  return lang === "es" ? "pasalopalante.com" : "passkindnessforward.com";
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
function img(src: string): Promise<HTMLImageElement | null> {
  if (!cache.has(src))
    cache.set(
      src,
      new Promise((resolve) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () => resolve(null);
        i.src = src;
      }),
    );
  return cache.get(src)!;
}

function cover(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number, focusY = 0.35) {
  const s = Math.max(w / im.width, h / im.height);
  const dw = im.width * s;
  const dh = im.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) * focusY, dw, dh);
  ctx.restore();
}

function contain(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / im.width, h / im.height);
  ctx.drawImage(im, x + (w - im.width * s) / 2, y + (h - im.height * s) / 2, im.width * s, im.height * s);
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#fdb813");
  g.addColorStop(1, "#f37023");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function boxText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, bg: string, fg: string, weight = 800) {
  ctx.font = `${weight} ${size}px Montserrat, Arial, sans-serif`;
  const w = ctx.measureText(text).width;
  const padX = size * 0.42;
  const h = size * 1.38;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w + padX * 2, h);
  ctx.fillStyle = fg;
  ctx.fillText(text, x + padX, y + size * 1.03);
  return w + padX * 2;
}

/** Biggest font size (down to min) at which the text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number, start: number, min = 20, weight = 800) {
  let s = start;
  while (s > min) {
    ctx.font = `${weight} ${s}px Montserrat, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxW) break;
    s -= 2;
  }
  return s;
}

/** A white square tab holding a logo. */
function logoTab(ctx: CanvasRenderingContext2D, im: HTMLImageElement | null, x: number, y: number, w: number, h: number, pad: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  if (im) contain(ctx, im, x + pad, y + pad, w - pad * 2, h - pad * 2);
}

/**
 * Draws a logo as large as it can be inside a circle: it measures how far the logo's visible
 * pixels reach from their centre, so a round logo fills the circle and a wide one fits its width.
 */
function fitInCircle(ctx: CanvasRenderingContext2D, im: HTMLImageElement, cx: number, cy: number, r: number) {
  const probe = 240;
  const k = probe / Math.max(im.width, im.height);
  const pw = Math.max(1, Math.round(im.width * k));
  const ph = Math.max(1, Math.round(im.height * k));
  let reach = Math.hypot(pw, ph) / 2;
  let ox = pw / 2;
  let oy = ph / 2;
  try {
    const t = document.createElement("canvas");
    t.width = pw;
    t.height = ph;
    const tc = t.getContext("2d")!;
    tc.drawImage(im, 0, 0, pw, ph);
    const d = tc.getImageData(0, 0, pw, ph).data;
    let minX = pw, minY = ph, maxX = 0, maxY = 0;
    const solid = (i: number) => d[i + 3] > 24 && !(d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245);
    for (let y = 0; y < ph; y++)
      for (let x = 0; x < pw; x++)
        if (solid((y * pw + x) * 4)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
    if (maxX >= minX && maxY >= minY) {
      ox = (minX + maxX + 1) / 2;
      oy = (minY + maxY + 1) / 2;
      reach = 0;
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= maxX; x++) if (solid((y * pw + x) * 4)) reach = Math.max(reach, Math.hypot(x + 0.5 - ox, y + 0.5 - oy));
    }
  } catch {
    /* a logo from another website can't be measured; the box is used instead */
  }
  const scale = (r / Math.max(reach, 1)) * k;
  ctx.drawImage(im, cx - ox * (scale / k), cy - oy * (scale / k), im.width * scale, im.height * scale);
}

export async function drawCobrand(
  format: CobrandFormat,
  opts: { kind: Kind; lang: "en" | "es"; name: string; logoUrl: string | null; photoUrl?: string | null },
): Promise<HTMLCanvasElement> {
  const { w: W, h: H } = FORMATS[format];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (document.fonts?.load) await Promise.all([document.fonts.load("800 40px Montserrat"), document.fonts.load("600 40px Montserrat")]).catch(() => undefined);
  const [sky, ours, theirs, photo] = await Promise.all([
    img("/hub/sky.jpg"),
    img(opts.lang === "es" ? "/hub/ppl-logo.png" : "/hub/kf-logo-2x.png"),
    opts.logoUrl ? img(opts.logoUrl) : Promise.resolve(null),
    opts.photoUrl ? img(opts.photoUrl) : Promise.resolve(null),
  ]);
  const hot = opts.lang === "es" ? CORAL : MAGENTA;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const template = PHOTO_TEMPLATES[format];
  if (template) {
    // their photo fills the template's photo area; the official design goes on top
    const [x, y, w, h] = template.window;
    if (photo) cover(ctx, photo, x, y, w, h, template.focus);
    const overlay = await img(template.file(opts.lang));
    if (overlay) ctx.drawImage(overlay, 0, 0, W, H);
    if (theirs && (format === "announcePost" || format === "announceStory")) {
      // their logo on a white tab across from ours, the same height as ours
      const story = format === "announceStory";
      const tabH = story ? 120 : 104;
      const top = story ? 250 : 52;
      const pad = story ? 14 : 12;
      const ratio = Math.min(Math.max(theirs.width / theirs.height, 0.8), 3.2);
      const tabW = Math.round((tabH - pad * 2) * ratio + pad * 2);
      const left = W - (story ? 64 : 56) - tabW;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(left, top, tabW, tabH, story ? 18 : 16);
      ctx.fill();
      contain(ctx, theirs, left + pad, top + pad, tabW - pad * 2, tabH - pad * 2);
    }
    return c;
  }
  if (format === "profile") {
    // their photo fills the frame; a logo is sized to fill the circle inside the ring
    if (photo) cover(ctx, photo, 0, 0, W, H, 0.35);
    else if (theirs) fitInCircle(ctx, theirs, W / 2, H / 2, W * 0.4 * 0.9);
    const frame = await img(frameFor(opts.kind, opts.lang));
    if (frame) ctx.drawImage(frame, 0, 0, W, H);
    return c;
  }

  if (format === "post" || format === "story") {
    // a full sunny sky, the big name of the movement, and both logos together on one white strip
    const story = format === "story";
    if (sky) cover(ctx, sky, 0, 0, W, H, 0.3);
    else {
      ctx.fillStyle = "#8fd3f2";
      ctx.fillRect(0, 0, W, H);
    }
    const lines = brandLines(opts.lang);
    let y = story ? 420 : 120;
    boxText(ctx, line1(opts.kind, opts.lang), 80, y, story ? 58 : 50, hot, "#ffffff");
    y += story ? 120 : 100;
    const big = Math.min(fit(ctx, lines[0], W - 170, story ? 250 : 210, 60, 900), fit(ctx, lines[1], W - 170, story ? 250 : 210, 60, 900));
    ctx.font = `900 ${big}px Montserrat, Arial, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(14,35,75,.32)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 6;
    ctx.fillText(lines[0], 72, y + big * 0.8);
    ctx.fillText(lines[1], 72, y + big * 0.8 + big * 0.95);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    y += big * 0.8 + big * 0.95 + (story ? 110 : 80);
    const ns = fit(ctx, opts.name, W - 210, story ? 66 : 56, 24);
    boxText(ctx, opts.name, 80, y, ns, "#ffffff", NAVY, 800);
    y += ns * 1.38 + (story ? 56 : 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${story ? 40 : 34}px Montserrat, Arial, sans-serif`;
    ctx.shadowColor = "rgba(14,35,75,.45)";
    ctx.shadowBlur = 12;
    ctx.fillText(season(opts.lang), 84, y);
    ctx.shadowBlur = 0;

    const bandH = story ? 430 : 330;
    const bandY = H - 14 - bandH;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, bandY, W, bandH);
    const pad = story ? 70 : 50;
    const logoH = bandH - pad * 2 - (story ? 70 : 56);
    const leftW = Math.round((W - 160) * 0.36);
    const divX = 80 + leftW + 44;
    if (theirs) contain(ctx, theirs, 80, bandY + pad, leftW, logoH);
    ctx.fillStyle = "#dcecf5";
    ctx.fillRect(divX, bandY + pad, 3, logoH);
    if (ours) contain(ctx, ours, divX + 48, bandY + pad + logoH * 0.12, W - 80 - (divX + 48), logoH * 0.76);
    ctx.fillStyle = hot;
    ctx.font = `800 ${story ? 40 : 32}px Montserrat, Arial, sans-serif`;
    ctx.fillText(site(opts.lang), 80, H - 14 - (story ? 56 : 40));
    bar(ctx, 0, H - 14, W, 14);
  } else if (format === "badge") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#dcecf5";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
    logoTab(ctx, theirs, 50, 50, 300, 300, 18);
    ctx.fillStyle = "#dcecf5";
    ctx.fillRect(390, 70, 4, 260);
    ctx.fillStyle = INK2;
    ctx.font = "700 40px Montserrat, Arial, sans-serif";
    ctx.fillText(opts.lang === "es" ? (opts.kind === "ambassador" ? "Embajador/a de" : "Orgullosamente parte de") : opts.kind === "ambassador" ? "Proud ambassador for" : "Proud partner of", 440, 120);
    if (ours) contain(ctx, ours, 440, 150, W - 440 - 60, 150);
    bar(ctx, 0, H - 16, W, 16);
  } else {
    // LinkedIn puts the profile picture over the bottom left, so the words sit in the middle and
    // both logos share one white panel on the right
    if (sky) cover(ctx, sky, 0, 0, W, H, 0.4);
    const panelW = 520;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(W - panelW, 0, panelW, H - 14);
    const x = 440;
    boxText(ctx, line1(opts.kind, opts.lang), x, 70, 36, hot, "#ffffff");
    const lines = brandLines(opts.lang);
    const bs = fit(ctx, `${lines[0]} ${lines[1]}`, W - panelW - x - 50, 96, 40, 900);
    ctx.font = `900 ${bs}px Montserrat, Arial, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(14,35,75,.32)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillText(`${lines[0]} ${lines[1]}`, x - 4, 140 + bs * 0.85);
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 0;
    ctx.font = "700 28px Montserrat, Arial, sans-serif";
    ctx.fillText(season(opts.lang), x, 300);
    ctx.shadowBlur = 0;
    const px = W - panelW + 50;
    if (theirs) contain(ctx, theirs, px, 70, 170, 230);
    ctx.fillStyle = "#dcecf5";
    ctx.fillRect(px + 200, 90, 3, 190);
    if (ours) contain(ctx, ours, px + 230, 120, panelW - 50 - 230 - 30, 130);
    bar(ctx, 0, H - 14, W, 14);
  }
  return c;
}

export function canvasBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png");
    } catch (e) {
      reject(e);
    }
  });
}
