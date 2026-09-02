import { createContext, useContext, useState, type ReactNode } from "react";

type ShareMode = "performed" | "witnessed" | "received";

interface ShareModalOptions {
  initialMode?: ShareMode;
  initialDescription?: string;
}

interface UIContextType {
  /** Controls GlobalShareModal's own visibility. Set this only via
   *  openShareModal/closeShareModal — a page with its own local share
   *  dialog should use setLocalShareFlowOpen instead, or it'll pop the
   *  (separate, bare) global modal open on top of its own. */
  shareModalOpen: boolean;
  /** Opens the site-wide share-an-act modal (mounted once via GlobalShareModal). */
  openShareModal: (opts?: ShareModalOptions) => void;
  closeShareModal: () => void;
  shareModalOptions: ShareModalOptions;
  /** True while ANY share-an-act UI is visible — the global modal, or a
   *  page's own local one (daily acts, kindness ideas, inspiration card,
   *  ShareActCTA). Navbar reads this to hide its floating Share button
   *  rather than stacking it behind whatever's already open. */
  anyShareFlowOpen: boolean;
  /** A page with its own local share dialog calls this (true on open,
   *  false on close/unmount) purely to hide the navbar's floating Share
   *  button — it does not affect GlobalShareModal. */
  setLocalShareFlowOpen: (open: boolean) => void;
  /** True while a page's own Navbar (with its inline language switcher) is mounted. */
  navbarMounted: boolean;
  setNavbarMounted: (mounted: boolean) => void;
}

const noop = () => {};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalOptions, setShareModalOptions] = useState<ShareModalOptions>({});
  const [localShareFlowOpen, setLocalShareFlowOpen] = useState(false);
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
        openShareModal,
        closeShareModal,
        shareModalOptions,
        anyShareFlowOpen: shareModalOpen || localShareFlowOpen,
        setLocalShareFlowOpen,
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
      openShareModal: noop,
      closeShareModal: noop,
      shareModalOptions: {},
      anyShareFlowOpen: false,
      setLocalShareFlowOpen: noop,
      navbarMounted: false,
      setNavbarMounted: noop,
    };
  }
  return ctx;
};
