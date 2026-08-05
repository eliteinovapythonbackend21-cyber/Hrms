import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { getTheme } from "./themes";

const ThemeContext = createContext(null);

const STORAGE_KEY = "hrms_theme";

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return "dark";
  });

  const theme = useMemo(() => getTheme(mode), [mode]);

  // Inject CSS variables and toggle the `dark` class on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    const colors = theme.colors;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [mode, theme]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    setMode(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
