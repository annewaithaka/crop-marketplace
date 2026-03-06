import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

const THEME_KEY = "theme"; // "dark" | "light"

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const initial = saved || "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const value = useMemo(() => ({
    theme,
    toggle() {
      const next = theme === "dark" ? "light" : "dark";
      setTheme(next);
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    }
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}