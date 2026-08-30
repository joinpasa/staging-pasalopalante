import { createContext, useContext, useState, type ReactNode } from "react";

type ShareMode = "performed" | "witnessed" | "received";

interface ShareModalOptions {
  initialMode?: ShareMode;
  initialDescription?: string;
}

interface UIContextType {
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
  /** Opens the site-wide share-an-act modal (mounted once via GlobalShareModal). */
  openShareModal: (opts?: ShareModalOptions) => void;
  closeShareModal: () => void;
  shareModalOptions: ShareModalOptions;
}

const noop = () => {};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalOptions, setShareModalOptions] = useState<ShareModalOptions>({});

  const openShareModal = (opts: ShareModalOptions = {}) => {
    setShareModalOptions(opts);
    setShareModalOpen(true);
  };
  const closeShareModal = () => setShareModalOpen(false);

  return (
    <UIContext.Provider
      value={{ shareModalOpen, setShareModalOpen, openShareModal, closeShareModal, shareModalOptions }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) {
    return {
      shareModalOpen: false,
      setShareModalOpen: noop,
      openShareModal: noop,
      closeShareModal: noop,
      shareModalOptions: {},
    };
  }
  return ctx;
};
