"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Sync from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("shelf-theme") as Theme | null;
      if (stored === "dark" || stored === "light") {
        setThemeState(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch { /* no-op in environments without localStorage */ }
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    try {
      localStorage.setItem("shelf-theme", t);
    } catch { /* no-op */ }
    document.documentElement.setAttribute("data-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
