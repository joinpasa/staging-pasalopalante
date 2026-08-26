import { createContext, useContext, useState, type ReactNode } from "react";

interface UIContextType {
  shareModalOpen: boolean;
  setShareModalOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  return (
    <UIContext.Provider value={{ shareModalOpen, setShareModalOpen }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) return { shareModalOpen: false, setShareModalOpen: () => {} };
  return ctx;
};
