import {
  Download,
  Link2,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Instagram,
  Smartphone,
} from "lucide-react";
import type { useShareActions } from "@shared/components/share/useShareActions";
import type { ShareOption } from "@shared/components/share/ShareOptionsGrid";

export interface ShareOptionLabels {
  nativeShare: string;
  facebook: string;
  twitter: string;
  whatsapp: string;
  linkedin: string;
  instagram: string;
  copyLink: string;
  download: string;
}

/** The standard set of share destinations, in the standard order — used by
 *  both ShareDialog (popup) and any page rendering the same buttons inline. */
export function buildShareOptions(
  actions: ReturnType<typeof useShareActions>,
  labels: ShareOptionLabels,
): ShareOption[] {
  const {
    hasNativeShare,
    withBusy,
    downloadImage,
    copyLink,
    nativeShare,
    shareInstagram,
    shareFacebook,
    shareTwitter,
    shareWhatsApp,
    shareLinkedIn,
  } = actions;

  const options: ShareOption[] = [];
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
  return options;
}
