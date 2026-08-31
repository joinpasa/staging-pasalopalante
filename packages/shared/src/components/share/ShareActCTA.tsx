import { useEffect, useState } from "react";
import { useUI } from "@shared/contexts/UIContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@shared/components/ui/dialog";
import { useLanguage } from "@shared/contexts/LanguageContext";
import ShareActFlow from "./ShareActFlow";

interface Props {
  /** "inline" renders the form directly, no Dialog — for embedding in a
   *  page section. "modal" (default) opens it in the existing popup. */
  variant?: "modal" | "inline";
}

export default function ShareActCTA({ variant = "modal" }: Props) {
  const { t } = useLanguage();
  const { setShareModalOpen } = useUI();
  const [open, setOpen] = useState(false);

  // Only the modal variant hides the navbar while it's open — there's no
  // modal to hide for the inline variant, and firing this there would hide
  // the navbar while someone scrolls the page.
  useEffect(() => {
    if (variant !== "modal") return;
    setShareModalOpen(open);
    return () => setShareModalOpen(false);
  }, [open, variant, setShareModalOpen]);

  if (variant === "inline") {
    return <ShareActFlow singleStep />;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        {t.share.sectionCta}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="headline-md text-foreground">
              {t.share.sectionHeading}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 pb-2">
            <ShareActFlow onClose={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
