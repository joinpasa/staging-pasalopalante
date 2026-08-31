import { useState } from "react";
import { toast } from "sonner";

interface UseShareActionsArgs {
  getImageBlob: () => Promise<Blob | null>;
  shareUrl: string;
  shareText: string;
  labels: {
    copied: string;
    instagramHint: string;
    shareFailed: string;
  };
}

// Returns false when the browser silently blocked the popup (common on
// Safari and Chrome alike), so callers can fall back to something visible.
function openPopup(url: string): boolean {
  const win = window.open(url, "_blank", "noopener,noreferrer,width=640,height=720");
  return !!win;
}

/** Shared "share this act" action set — used by both the full ShareDialog
 *  popup and any page that wants a compact, inline subset of the same
 *  buttons (e.g. the share-thanks page's primary row). */
export function useShareActions({ getImageBlob, shareUrl, shareText, labels }: UseShareActionsArgs) {
  const [busy, setBusy] = useState<string | null>(null);
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

  // If the browser silently blocked the popup, fall back to copying the
  // link so the click still does something visible.
  async function shareViaPopup(url: string) {
    if (!openPopup(url)) await copyLink();
  }
  function shareFacebook() {
    return shareViaPopup(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
    );
  }
  function shareTwitter() {
    return shareViaPopup(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    );
  }
  function shareWhatsApp() {
    return shareViaPopup(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    );
  }
  function shareLinkedIn() {
    return shareViaPopup(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    );
  }

  return {
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
  };
}
