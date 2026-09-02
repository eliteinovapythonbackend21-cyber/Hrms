import { useCallback, useEffect, useState } from "react";

/**
 * Small segmented Table / Cards switch. Remembers the choice per-key in
 * localStorage so a user who prefers cards keeps them across visits.
 */
export function useViewMode(storageKey, defaultMode = "table") {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultMode;
    } catch {
      return defaultMode;
    }
  });

  const set = useCallback(
    (value) => {
      setMode(value);
      try {
        localStorage.setItem(storageKey, value);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  useEffect(() => {
    /* keep in sync if the key changes */
  }, [storageKey]);

  return [mode, set];
}

const TableIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9 4v16" />
  </svg>
);

const CardsIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

export default function ViewToggle({ mode, onChange, className = "" }) {
  const opt = (value, label, icon) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
        mode === value
          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      }`}
      aria-pressed={mode === value}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div
      className={`inline-flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06] ${className}`}
    >
      {opt("table", "Table", <TableIcon />)}
      {opt("cards", "Cards", <CardsIcon />)}
    </div>
  );
}
