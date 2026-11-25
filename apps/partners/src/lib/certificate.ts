/**
 * A certificate of kindness, drawn in the browser and saved as a PNG: the member's name, their
 * acts, the season, the official logo. Nothing is sent anywhere.
 */
export interface CertificateInput {
  name: string;
  acts: number;
  lang: "en" | "es";
  locale: string;
  logoUrl?: string | null;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, weight = 800) {
  let size = start;
  do {
    ctx.font = `${weight} ${size}px Montserrat, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size > 18);
  return size;
}

export async function drawCertificate({ name, acts, lang, locale, logoUrl }: CertificateInput): Promise<Blob> {
  const W = 2000;
  const H = 1414;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  if (document.fonts?.load) await Promise.all([document.fonts.load("800 40px Montserrat"), document.fonts.load("600 40px Montserrat")]).catch(() => undefined);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // sky band and the gold to orange bar
  const sky = await loadImage("/hub/sky.jpg");
  if (sky) {
    const bandH = 360;
    const scale = Math.max(W / sky.width, bandH / sky.height);
    ctx.drawImage(sky, (W - sky.width * scale) / 2, (bandH - sky.height * scale) * 0.4, sky.width * scale, sky.height * scale);
  } else {
    ctx.fillStyle = "#8fd3f2";
    ctx.fillRect(0, 0, W, 360);
  }
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, "#fdb813");
  bar.addColorStop(1, "#f37023");
  ctx.fillStyle = bar;
  ctx.fillRect(0, 360, W, 18);
  ctx.fillRect(0, H - 18, W, 18);

  // official logo on a white tab
  const logo = await loadImage("/kf-logo.webp");
  if (logo) {
    const lh = 110;
    const lw = (logo.width / logo.height) * lh;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(120, 70, lw + 60, lh + 50);
    ctx.drawImage(logo, 150, 95, lw, lh);
  }

  const es = lang === "es";
  // title in a magenta box
  const title = es ? "Certificado de bondad" : "Certificate of kindness";
  ctx.font = "800 64px Montserrat, Arial, sans-serif";
  const tw = ctx.measureText(title).width;
  ctx.fillStyle = "#d81b60";
  ctx.fillRect(120, 250, tw + 56, 92);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, 148, 318);

  ctx.fillStyle = "#33415e";
  ctx.font = "600 40px Montserrat, Arial, sans-serif";
  ctx.fillText(es ? "Con gratitud para" : "With gratitude to", 120, 520);

  ctx.fillStyle = "#0e234b";
  const size = fitText(ctx, name, W - 240 - (logoUrl ? 300 : 0), 120);
  ctx.font = `800 ${size}px Montserrat, Arial, sans-serif`;
  ctx.fillText(name, 120, 520 + size + 20);

  const line = es
    ? `por ${acts.toLocaleString(locale)} actos de bondad en la Temporada Global de Bondad 2026–2027.`
    : `for ${acts.toLocaleString(locale)} acts of kindness during Global Kindness Season 2026–2027.`;
  ctx.fillStyle = "#33415e";
  const lineSize = fitText(ctx, line, W - 240, 44, 600);
  ctx.font = `600 ${lineSize}px Montserrat, Arial, sans-serif`;
  ctx.fillText(line, 120, 520 + size + 120);

  ctx.fillStyle = "#0e234b";
  ctx.font = "800 40px Montserrat, Arial, sans-serif";
  ctx.fillText(es ? "Cada acto de bondad cuenta." : "Every act of kindness counts.", 120, H - 200);
  ctx.fillStyle = "#6b7790";
  ctx.font = "600 32px Montserrat, Arial, sans-serif";
  ctx.fillText(`Kindness Forward · ${new Date().toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}`, 120, H - 140);

  if (logoUrl) {
    const theirs = await loadImage(logoUrl);
    if (theirs) {
      const box = 260;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#dcecf5";
      ctx.lineWidth = 4;
      ctx.fillRect(W - 120 - box, 470, box, box);
      ctx.strokeRect(W - 120 - box, 470, box, box);
      const s = Math.min((box - 40) / theirs.width, (box - 40) / theirs.height);
      ctx.drawImage(theirs, W - 120 - box + (box - theirs.width * s) / 2, 470 + (box - theirs.height * s) / 2, theirs.width * s, theirs.height * s);
    }
  }

  try {
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
  } catch (e) {
    // a logo from another website can block saving the picture; then leave it off
    if (logoUrl) return drawCertificate({ name, acts, lang, locale, logoUrl: null });
    throw e;
  }
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
