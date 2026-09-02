import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import PasaMark from "./PasaMark";

interface PassQrCodeProps {
  /** The URL the QR code encodes — what a phone camera opens when it scans. */
  value: string;
}

export interface PassQrCodeHandle {
  /** Renders the QR + center mark to a PNG and triggers a download. */
  download: (filename?: string) => Promise<void>;
}

const DOWNLOAD_SIZE = 640;

function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("QR image failed to load"));
    };
    img.src = url;
  });
}

/** Copies each computed CSS fill color onto the matching element as an
 *  inline attribute — a serialized SVG loses access to Tailwind's
 *  stylesheet, so class-based fills (like PasaMark's) would otherwise
 *  render black. */
function inlineFillColors(original: SVGSVGElement): SVGSVGElement {
  const clone = original.cloneNode(true) as SVGSVGElement;
  const originalEls = original.querySelectorAll("*");
  const cloneEls = clone.querySelectorAll("*");
  originalEls.forEach((el, i) => {
    const fill = getComputedStyle(el).fill;
    if (fill && fill !== "none") cloneEls[i]?.setAttribute("fill", fill);
  });
  return clone;
}

/**
 * A real, scannable QR code for the pass. Colors are pulled from the app
 * design tokens at runtime so the code stays on-theme without hardcoding hex.
 */
const PassQrCode = forwardRef<PassQrCodeHandle, PassQrCodeProps>(({ value }, ref) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const markWrapRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<{ fg: string; bg: string } | null>(null);

  useEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const styles = getComputedStyle(el);
    setColors({ fg: styles.color, bg: styles.backgroundColor });
  }, []);

  useImperativeHandle(ref, () => ({
    async download(filename = "pasalo-palante-pass-code.png") {
      const wrap = wrapRef.current;
      const markWrap = markWrapRef.current;
      if (!wrap || !markWrap) return;
      const svgs = wrap.querySelectorAll("svg");
      const qrSvg = svgs[0] as SVGSVGElement | undefined;
      const markSvg = svgs[1] as SVGSVGElement | undefined;
      if (!qrSvg || !markSvg) return;

      const wrapRect = wrap.getBoundingClientRect();
      const markWrapRect = markWrap.getBoundingClientRect();
      const scale = DOWNLOAD_SIZE / wrapRect.width;

      const canvas = document.createElement("canvas");
      canvas.width = DOWNLOAD_SIZE;
      canvas.height = DOWNLOAD_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const qrImg = await svgToImage(qrSvg);
      ctx.drawImage(qrImg, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);

      // The white rounded tile behind the mark, at the same relative
      // position/size it renders on screen.
      const tileX = (markWrapRect.left - wrapRect.left) * scale;
      const tileY = (markWrapRect.top - wrapRect.top) * scale;
      const tileW = markWrapRect.width * scale;
      const tileH = markWrapRect.height * scale;
      const radius = 12 * scale;
      ctx.fillStyle = getComputedStyle(markWrap).backgroundColor;
      ctx.beginPath();
      ctx.roundRect(tileX, tileY, tileW, tileH, radius);
      ctx.fill();

      const markImg = await svgToImage(inlineFillColors(markSvg));
      const markRect = markSvg.getBoundingClientRect();
      const markX = (markRect.left - wrapRect.left) * scale;
      const markY = (markRect.top - wrapRect.top) * scale;
      ctx.drawImage(markImg, markX, markY, markRect.width * scale, markRect.height * scale);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
  }));

  return (
    <div ref={wrapRef} className="relative aspect-square w-full">
      <div ref={probeRef} className="pointer-events-none absolute h-0 w-0 bg-app-surface text-app-ink" />
      {colors && (
        <QRCodeSVG
          value={value}
          level="H"
          marginSize={2}
          fgColor={colors.fg}
          bgColor={colors.bg}
          className="h-full w-full"
          title="Pásalo Pa'lante pass code"
        />
      )}
      {/* High error correction leaves room for the mark in the middle. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div ref={markWrapRef} className="rounded-2xl bg-app-surface p-1.5">
          <PasaMark className="h-12 w-12" />
        </div>
      </div>
    </div>
  );
});
PassQrCode.displayName = "PassQrCode";

export default PassQrCode;
