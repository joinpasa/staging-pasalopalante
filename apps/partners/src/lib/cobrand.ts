import type { Kind } from "./kinds";

/**
 * "Made for you": ready pictures drawn in the browser from the member's own logo and, if they add
 * one, their own photo, next to the official Kindness Forward (or, in Spanish, Pásalo Pa'lante)
 * logo and the official profile frames. The official artwork is drawn exactly as supplied, never
 * redrawn, and words never sit on the photo. Nothing is uploaded: the photo stays on the device.
 */
export type CobrandFormat = "post" | "story" | "badge" | "banner" | "photoPost" | "photoStory" | "profile";

export const FORMATS: Record<CobrandFormat, { w: number; h: number; en: string; es: string }> = {
  post: { w: 1080, h: 1350, en: "Post", es: "Publicación" },
  story: { w: 1080, h: 1920, en: "Story", es: "Historia" },
  badge: { w: 1200, h: 400, en: "Badge for your website and email", es: "Insignia para tu web y correo" },
  banner: { w: 1584, h: 396, en: "LinkedIn banner", es: "Portada de LinkedIn" },
  photoPost: { w: 1080, h: 1350, en: "Post with your photo", es: "Publicación con tu foto" },
  photoStory: { w: 1080, h: 1920, en: "Story with your photo", es: "Historia con tu foto" },
  profile: { w: 1080, h: 1080, en: "Profile picture with our frame", es: "Foto de perfil con nuestro marco" },
};

/** Which pictures need the logo, and which the photo. */
export const LOGO_FORMATS: CobrandFormat[] = ["post", "story", "badge", "banner"];
export const PHOTO_FORMATS: CobrandFormat[] = ["photoPost", "photoStory", "profile"];

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

/** Both logos side by side on one white strip: theirs, a hairline, ours. */
function logoStrip(ctx: CanvasRenderingContext2D, W: number, y: number, h: number, theirs: HTMLImageElement | null, ours: HTMLImageElement | null, pad: number) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, y, W, h);
  const logoH = h - pad * 2;
  if (theirs) {
    const leftW = Math.round((W - 160) * 0.36);
    contain(ctx, theirs, 80, y + pad, leftW, logoH);
    const divX = 80 + leftW + 44;
    ctx.fillStyle = "#dcecf5";
    ctx.fillRect(divX, y + pad, 3, logoH);
    if (ours) contain(ctx, ours, divX + 48, y + pad + logoH * 0.12, W - 80 - (divX + 48), logoH * 0.76);
  } else if (ours) {
    contain(ctx, ours, 80, y + pad + logoH * 0.1, W - 160, logoH * 0.8);
  }
}

/** A photo with words under it (never on it) and the logo strip at the bottom. */
function photoLayout(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  photo: HTMLImageElement,
  theirs: HTMLImageElement | null,
  ours: HTMLImageElement | null,
  o: { kind: Kind; lang: "en" | "es"; name: string; hot: string; story: boolean },
) {
  const photoH = o.story ? 1120 : 760;
  cover(ctx, photo, 0, 0, W, photoH, 0.4);
  bar(ctx, 0, photoH, W, 14);
  let y = photoH + 14 + (o.story ? 70 : 44);
  boxText(ctx, line1(o.kind, o.lang), 80, y, o.story ? 48 : 40, o.hot, "#ffffff");
  y += o.story ? 96 : 80;
  const lines = brandLines(o.lang);
  const big = fit(ctx, `${lines[0]} ${lines[1]}`, W - 160, o.story ? 110 : 92, 40, 900);
  ctx.font = `900 ${big}px Montserrat, Arial, sans-serif`;
  ctx.fillStyle = NAVY;
  ctx.fillText(`${lines[0]} ${lines[1]}`, 76, y + big * 0.82);
  y += big + (o.story ? 40 : 26);
  ctx.fillStyle = INK2;
  const ns = fit(ctx, o.name, W - 160, o.story ? 44 : 36, 20, 700);
  ctx.font = `700 ${ns}px Montserrat, Arial, sans-serif`;
  ctx.fillText(o.name, 80, y + ns);
  const stripH = o.story ? 300 : 240;
  ctx.fillStyle = "#dcecf5";
  ctx.fillRect(80, H - 14 - stripH, W - 160, 3);
  logoStrip(ctx, W, H - 14 - stripH + 3, stripH - 3, theirs, ours, o.story ? 60 : 44);
  bar(ctx, 0, H - 14, W, 14);
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

  if (format === "photoPost" || format === "photoStory") {
    if (photo) photoLayout(ctx, W, H, photo, theirs, ours, { kind: opts.kind, lang: opts.lang, name: opts.name, hot, story: format === "photoStory" });
    return c;
  }
  if (format === "profile") {
    // their photo (or, without one, their logo on white) inside our official frame
    if (photo) cover(ctx, photo, 0, 0, W, H, 0.35);
    else if (theirs) contain(ctx, theirs, W * 0.22, H * 0.22, W * 0.56, H * 0.56);
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
