import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Button } from "@shared/components/ui/button";
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
import { useShareActions } from "@shared/components/share/useShareActions";

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
  const {
    busy,
    withBusy,
    hasNativeShare,
    downloadImage,
    copyLink,
    nativeShare,
    shareInstagram,
    shareFacebook,
    shareTwitter,
    shareWhatsApp,
    shareLinkedIn,
  } = useShareActions({ getImageBlob, shareUrl, shareText, labels });

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
      onClick: () => withBusy("facebook", shareFacebook),
    },
    {
      key: "twitter",
      label: labels.twitter,
      icon: <Twitter size={20} />,
      onClick: () => withBusy("twitter", shareTwitter),
    },
    {
      key: "whatsapp",
      label: labels.whatsapp,
      icon: <MessageCircle size={20} />,
      onClick: () => withBusy("whatsapp", shareWhatsApp),
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
              <span className="truncate text-xs sm:text-sm">{o.label}</span>
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
