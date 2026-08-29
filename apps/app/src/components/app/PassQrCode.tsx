import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import PasaMark from "./PasaMark";

interface PassQrCodeProps {
  /** The URL the QR code encodes — what a phone camera opens when it scans. */
  value: string;
}

/**
 * A real, scannable QR code for the pass. Colors are pulled from the app
 * design tokens at runtime so the code stays on-theme without hardcoding hex.
 */
export default function PassQrCode({ value }: PassQrCodeProps) {
  const probeRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<{ fg: string; bg: string } | null>(null);

  useEffect(() => {
    const el = probeRef.current;
    if (!el) return;
    const styles = getComputedStyle(el);
    setColors({ fg: styles.color, bg: styles.backgroundColor });
  }, []);

  return (
    <div className="relative aspect-square w-full">
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
        <div className="rounded-2xl bg-app-surface p-1.5">
          <PasaMark className="h-12 w-12" />
        </div>
      </div>
    </div>
  );
}
