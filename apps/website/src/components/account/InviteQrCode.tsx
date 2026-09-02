import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@shared/contexts/LanguageContext";

interface Props {
  value: string;
}

const DOWNLOAD_SIZE = 512;

/** Renders the invite link as a scannable, downloadable QR code. */
export default function InviteQrCode({ value }: Props) {
  const { t } = useLanguage();
  const wrapRef = useRef<HTMLDivElement>(null);

  async function download() {
    const svg = wrapRef.current?.querySelector("svg");
    if (!svg) return;
    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("QR image failed to load"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = DOWNLOAD_SIZE;
      canvas.height = DOWNLOAD_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);
      ctx.drawImage(img, 0, 0, DOWNLOAD_SIZE, DOWNLOAD_SIZE);
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "pasalo-palante-invite-qr.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error(t.account.invitesQrFailed);
    }
  }

  return (
    <div className="mt-5 flex flex-col items-center">
      <div ref={wrapRef} className="w-36 rounded-xl border border-border bg-white p-2.5">
        <QRCodeSVG
          value={value}
          level="H"
          marginSize={0}
          className="h-full w-full"
          title="Pásalo Pa'lante invite QR code"
        />
      </div>
      <button
        type="button"
        onClick={download}
        className="mt-3 flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary"
      >
        <Download size={14} />
        {t.account.invitesQrDownload}
      </button>
    </div>
  );
}
