import { useTheme } from "./useTheme";

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

// Explicit Light/Dark buttons (no toggle arrow) so the current mode is
// always visible rather than inferred from a single swapping icon.
export default function ThemeToggle({ collapsed = false }) {
  const { mode, setTheme } = useTheme();

  // `collapsed` only narrows the layout at the lg breakpoint (icon-rail
  // sidebar mode) — on mobile the sidebar is always full width, so labels
  // stay visible there regardless, matching how nav item labels behave.
  const btnClass = (value) =>
    `flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors flex-1 ${
      mode === value
        ? "bg-primary-500/10 text-primary-600 dark:bg-primary-400/15 dark:text-primary-300"
        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
    }`;

  return (
    <div className={`flex gap-1.5 ${collapsed ? "lg:flex-col" : ""}`}>
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        aria-pressed={mode === "light"}
        title="Light theme"
        className={btnClass("light")}
      >
        <SunIcon />
        <span className={collapsed ? "lg:hidden" : ""}>Light</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        aria-pressed={mode === "dark"}
        title="Dark theme"
        className={btnClass("dark")}
      >
        <MoonIcon />
        <span className={collapsed ? "lg:hidden" : ""}>Dark</span>
      </button>
    </div>
  );
}
