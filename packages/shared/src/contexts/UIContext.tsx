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
  /** True while a page's own Navbar (with its inline language switcher) is mounted. */
  navbarMounted: boolean;
  setNavbarMounted: (mounted: boolean) => void;
}

const noop = () => {};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalOptions, setShareModalOptions] = useState<ShareModalOptions>({});
  const [navbarMounted, setNavbarMounted] = useState(false);

  const openShareModal = (opts: ShareModalOptions = {}) => {
    setShareModalOptions(opts);
    setShareModalOpen(true);
  };
  const closeShareModal = () => setShareModalOpen(false);

  return (
    <UIContext.Provider
      value={{
        shareModalOpen,
        setShareModalOpen,
        openShareModal,
        closeShareModal,
        shareModalOptions,
        navbarMounted,
        setNavbarMounted,
      }}
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
      navbarMounted: false,
      setNavbarMounted: noop,
    };
  }
  return ctx;
};
