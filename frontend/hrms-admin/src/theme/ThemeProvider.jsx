import { createContext, useState, useEffect, useMemo, useCallback } from "react";
import { getTheme } from "./themes";

const ThemeContext = createContext(null);

const STORAGE_KEY = "hrms_theme";

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved === "light" || saved === "dark") {
        return saved;
      }

      // Default HRMS theme
      return "light";
    } catch {
      return "light";
    }
  });

  const theme = useMemo(() => getTheme(mode), [mode]);

  // Apply theme to the application.
  useEffect(() => {
    const root = document.documentElement;

    // Add dark class only when dark mode is selected.
    root.classList.toggle("dark", mode === "dark");

    // Apply theme CSS variables.
    const colors = theme.colors;

    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Keep the selected theme stored.
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage errors.
    }
  }, [mode, theme]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";

      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore localStorage errors.
      }

      return next;
    });
  }, []);

  const setTheme = useCallback((next) => {
    if (next !== "light" && next !== "dark") return;

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore localStorage errors.
    }

    setMode(next);
  }, []);

  const contextValue = useMemo(
    () => ({
      mode,
      theme,
      toggleTheme,
      setTheme,
    }),
    [mode, theme, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;