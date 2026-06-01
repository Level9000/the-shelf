"use client";

import { createContext, useContext, useState } from "react";

export type ActiveAvatar = "cass" | "ty" | "press";

const AvatarContext = createContext<{
  activeAvatar: ActiveAvatar;
  setActiveAvatar: (a: ActiveAvatar) => void;
}>({ activeAvatar: "cass", setActiveAvatar: () => {} });

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [activeAvatar, setActiveAvatar] = useState<ActiveAvatar>("cass");

  return (
    <AvatarContext.Provider value={{ activeAvatar, setActiveAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  return useContext(AvatarContext);
}
