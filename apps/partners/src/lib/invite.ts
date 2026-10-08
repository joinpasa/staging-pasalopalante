import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portal } from "./portalClient";
import { useSession } from "./session";
import { publicOrigin } from "./links";

export const inviteUrl = (token: string) => `${publicOrigin()}/join/${token}`;

/** The organization's invite token (only its own — see partner_my_invite). */
export function useInviteToken() {
  const { partner } = useSession();
  return useQuery({
    queryKey: ["invite", partner?.id],
    enabled: !!partner,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await portal.rpc("partner_my_invite");
      if (error) throw error;
      if (!data) throw new Error("no invite link");
      return data as string;
    },
  });
}

/** New token: every old link and printed QR code stops working. */
export function useResetInvite() {
  const { partner } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await portal.rpc("partner_reset_invite");
      if (error) throw error;
      return data as string;
    },
    onSuccess: (token) => qc.setQueryData(["invite", partner?.id], token),
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A phone-friendly PNG card (QR + organization name) for group chats.
 * `qr` is a rendered QR canvas; everything is same-origin so it exports cleanly.
 */
export async function buildQrCard(qr: HTMLCanvasElement, org: string, caption: string) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#F8F6F1";
  ctx.fillRect(0, 0, W, H);

  try {
    await document.fonts?.ready;
  } catch {
    /* system font is fine */
  }
  const logo = await loadImage("/kf-logo.webp").catch(() => null);
  if (logo) {
    const lh = 110;
    const lw = (logo.width / logo.height) * lh;
    ctx.drawImage(logo, (W - lw) / 2, 70, lw, lh);
  }

  // White card behind the code.
  const size = 760;
  const x = (W - size) / 2;
  const y = 230;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(x - 30, y - 30, size + 60, size + 60, 48);
  ctx.fill();
  ctx.drawImage(qr, x, y, size, size);

  ctx.fillStyle = "#0E234B";
  ctx.textAlign = "center";
  ctx.font = "800 60px Montserrat, system-ui, sans-serif";
  let ty = y + size + 120;
  for (const l of wrapLines(ctx, org, W - 140).slice(0, 2)) {
    ctx.fillText(l, W / 2, ty);
    ty += 70;
  }
  ctx.fillStyle = "#4A5875";
  ctx.font = "600 38px Montserrat, system-ui, sans-serif";
  ctx.fillText(caption, W / 2, ty + 10);

  return new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"),
  );
}
