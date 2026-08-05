import { createContext, useState, useContext, useCallback } from "react";

const UIContext = createContext(null);

const COLLAPSE_STORAGE_KEY = "hrms_sidebar_collapsed";

export function UIProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1"
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  return (
    <UIContext.Provider
      value={{ sidebarOpen, toggleSidebar, closeSidebar, sidebarCollapsed, toggleSidebarCollapsed }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
