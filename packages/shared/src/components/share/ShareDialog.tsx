import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
import { toast } from "sonner";
import {
  Download,
  Link2,
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Instagram,
  Smartphone,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Caller provides a way to (re-)generate the PNG blob on demand.
  getImageBlob: () => Promise<Blob | null>;
  shareUrl: string;
  shareText: string;
  preview?: ReactNode;
  helperText: string;
  title: string;
  description: string;
  // Localized labels
  labels: {
    nativeShare: string;
    facebook: string;
    twitter: string;
    whatsapp: string;
    linkedin: string;
    instagram: string;
    copyLink: string;
    download: string;
    copied: string;
    instagramHint: string;
    shareFailed: string;
  };
}

function openPopup(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=640,height=720");
}

export default function ShareDialog({
  open,
  onOpenChange,
  getImageBlob,
  shareUrl,
  shareText,
  preview,
  helperText,
  title,
  description,
  labels,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const canNativeShareFiles = (() => {
    try {
      const f = new File([new Blob(["x"])], "x.png", { type: "image/png" });
      return !!navigator.canShare?.({ files: [f] });
    } catch {
      return false;
    }
  })();
  const hasNativeShare = typeof navigator.share === "function";

  async function withBusy<T>(key: string, fn: () => Promise<T>) {
    try {
      setBusy(key);
      await fn();
    } catch (e: unknown) {
      const name = (e as { name?: string } | null)?.name;
      // User cancelled the native share sheet — not an error.
      if (name === "AbortError" || name === "NotAllowedError") return;
      console.error(e);
      toast.error(labels.shareFailed);
    } finally {
      setBusy(null);
    }
  }

  async function downloadImage() {
    const blob = await getImageBlob();
    if (!blob) throw new Error("no image");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pasalo-palante.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    toast.success(labels.copied);
  }

  async function nativeShare() {
    let file: File | null = null;
    try {
      const blob = await getImageBlob();
      file = blob ? new File([blob], "pasalo-palante.png", { type: "image/png" }) : null;
    } catch (err) {
      console.error("image generation failed", err);
    }
    // Prefer sharing the real image + text only (no title, no url) so the OS sheet
    // treats the kindness image as the primary payload (Instagram, Photos, etc.).
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ text: shareText, files: [file] });
    } else if (hasNativeShare) {
      await navigator.share({ text: shareText });
    } else {
      await copyLink();
    }
  }

  async function shareInstagram() {
    // Instagram has no public web share intent for arbitrary content.
    // Best-effort: try native share (mobile), otherwise download image and copy
    // caption so the user can paste into Instagram.
    if (hasNativeShare) {
      const blob = await getImageBlob();
      const file = blob ? new File([blob], "pasalo-palante.png", { type: "image/png" }) : null;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ text: shareText, files: [file] });
        return;
      }
    }
    await downloadImage();
    try {
      await navigator.clipboard.writeText(shareText);
    } catch { /* noop */ }
    toast.success(labels.instagramHint);
  }

  function shareFacebook() {
    openPopup(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    );
  }
  function shareTwitter() {
    openPopup(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    );
  }
  function shareWhatsApp() {
    openPopup(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    );
  }
  function shareLinkedIn() {
    openPopup(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    );
  }

  type Option = {
    key: string;
    label: string;
    icon: ReactNode;
    onClick: () => Promise<void> | void;
    accent?: boolean;
  };

  const options: Option[] = [];
  if (hasNativeShare) {
    options.push({
      key: "native",
      label: labels.nativeShare,
      icon: <Smartphone size={20} />,
      accent: true,
      onClick: () => withBusy("native", nativeShare),
    });
  }
  options.push(
    {
      key: "instagram",
      label: labels.instagram,
      icon: <Instagram size={20} />,
      onClick: () => withBusy("instagram", shareInstagram),
    },
    {
      key: "facebook",
      label: labels.facebook,
      icon: <Facebook size={20} />,
      onClick: () => shareFacebook(),
    },
    {
      key: "twitter",
      label: labels.twitter,
      icon: <Twitter size={20} />,
      onClick: () => shareTwitter(),
    },
    {
      key: "whatsapp",
      label: labels.whatsapp,
      icon: <MessageCircle size={20} />,
      onClick: () => shareWhatsApp(),
    },
    {
      key: "linkedin",
      label: labels.linkedin,
      icon: <Linkedin size={20} />,
      onClick: () => shareLinkedIn(),
    },
    {
      key: "copy",
      label: labels.copyLink,
      icon: <Link2 size={20} />,
      onClick: () => withBusy("copy", copyLink),
    },
    {
      key: "download",
      label: labels.download,
      icon: <Download size={20} />,
      onClick: () => withBusy("download", downloadImage),
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={18} className="text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {preview && (
          <div className="mx-auto w-full max-w-[220px]">{preview}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
          {options.map((o) => (
            <Button
              key={o.key}
              variant={o.accent ? "default" : "outline"}
              disabled={busy === o.key}
              onClick={() => o.onClick()}
              className="justify-start gap-2 h-11"
            >
              <span className="shrink-0">{o.icon}</span>
              <span className="truncate text-sm">{o.label}</span>
            </Button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
          {helperText}
        </p>
      </DialogContent>
    </Dialog>
  );
}
