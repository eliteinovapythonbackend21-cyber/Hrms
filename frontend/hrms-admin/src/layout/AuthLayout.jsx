import ThemeToggle from "@/theme/ThemeToggle";

// Shared chrome for the Login/Register screens: a glowing brand-gradient
// backdrop behind a single centered card. Colors stay on-brand (gold/teal)
// so this matches the rest of the dark-first app rather than a one-off palette.
export default function AuthLayout({ title, subtitle, children, topRight }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-[#0b1120]">
      {/* Decorative glow blobs — brand gold + teal, dark mode only */}
      <div
        className="hidden dark:block pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary-500/20 blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="hidden dark:block pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-accent-500/20 blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="hidden dark:block pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-primary-400/10 blur-[90px]"
        aria-hidden="true"
      />

      <div className="absolute top-4 left-4 z-10">
        <ThemeToggle />
      </div>

      {topRight && (
        <div className="absolute top-4 right-4 z-10">
          {topRight}
        </div>
      )}

      <div className="w-full max-w-md relative z-10">
        <div className="card p-8 dark:shadow-[0_0_60px_-15px_rgba(212,148,31,0.25)]">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
