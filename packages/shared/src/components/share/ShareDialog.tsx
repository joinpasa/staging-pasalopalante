import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { Share2 } from "lucide-react";
import { useShareActions } from "@shared/components/share/useShareActions";
import { buildShareOptions, type ShareOptionLabels } from "@shared/components/share/buildShareOptions";
import ShareOptionsGrid from "@shared/components/share/ShareOptionsGrid";

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
  labels: ShareOptionLabels & {
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
  const actions = useShareActions({ getImageBlob, shareUrl, shareText, labels });
  const options = buildShareOptions(actions, labels);

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

        <div className="mt-2">
          <ShareOptionsGrid options={options} busy={actions.busy} />
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
          {helperText}
        </p>
      </DialogContent>
    </Dialog>
  );
}
