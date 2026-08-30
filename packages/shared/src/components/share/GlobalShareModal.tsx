import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useUI } from "@shared/contexts/UIContext";
import ShareActFlow from "@shared/components/share/ShareActFlow";

/**
 * Site-wide "share an act" modal, mounted once at the app root and opened
 * from anywhere via useUI().openShareModal() — so a click never navigates
 * away from the page the user was on. Keep this the only place this exact
 * (bare, no initial mode) flow is rendered; pages that need a custom onClose
 * side effect (marking an idea done, advancing a queue) keep their own
 * local Dialog + ShareActFlow instead of this one.
 *
 * Uses raw Radix Dialog primitives (rather than the shared DialogContent
 * wrapper) so its backdrop/card styling can differ from every other dialog
 * on the site without touching the shared primitive the app also uses.
 */
export default function GlobalShareModal() {
  const { shareModalOpen, closeShareModal, shareModalOptions } = useUI();

  return (
    <DialogPrimitive.Root open={shareModalOpen} onOpenChange={(o) => !o && closeShareModal()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 max-h-[90vh] overflow-y-auto rounded-3xl bg-background p-6 sm:p-8 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Share an act of kindness</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-5 top-5 rounded-full p-1.5 text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <X size={20} />
          </DialogPrimitive.Close>
          <ShareActFlow
            initialMode={shareModalOptions.initialMode}
            initialDescription={shareModalOptions.initialDescription}
            onClose={closeShareModal}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
