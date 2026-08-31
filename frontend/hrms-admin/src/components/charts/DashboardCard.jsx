import { Link } from "react-router-dom";

/* Per-accent styling. `tile` = icon chip, `glow` = ambient corner wash,
   `bar` = progress fill, `ring` = donut stroke hex. */
const THEME = {
  primary: {
    tile: "bg-gradient-to-br from-primary-400/25 to-primary-500/5 text-primary-600 ring-1 ring-inset ring-primary-400/25 dark:text-primary-300",
    glow: "bg-primary-500/20",
    bar: "bg-gradient-to-r from-primary-500 to-primary-400",
    strip: "bg-gradient-to-r from-primary-500 via-primary-400 to-transparent",
    ring: "#e2a938",
  },
  accent: {
    tile: "bg-gradient-to-br from-accent-400/25 to-accent-500/5 text-accent-600 ring-1 ring-inset ring-accent-400/25 dark:text-accent-300",
    glow: "bg-accent-500/20",
    bar: "bg-gradient-to-r from-accent-500 to-accent-400",
    strip: "bg-gradient-to-r from-accent-500 via-accent-400 to-transparent",
    ring: "#2dd4bf",
  },
  success: {
    tile: "bg-gradient-to-br from-emerald-400/25 to-emerald-500/5 text-emerald-600 ring-1 ring-inset ring-emerald-400/25 dark:text-emerald-300",
    glow: "bg-emerald-500/20",
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    strip: "bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent",
    ring: "#22c55e",
  },
  warning: {
    tile: "bg-gradient-to-br from-amber-400/25 to-amber-500/5 text-amber-600 ring-1 ring-inset ring-amber-400/25 dark:text-amber-300",
    glow: "bg-amber-500/20",
    bar: "bg-gradient-to-r from-amber-500 to-amber-400",
    strip: "bg-gradient-to-r from-amber-500 via-amber-400 to-transparent",
    ring: "#f59e0b",
  },
  danger: {
    tile: "bg-gradient-to-br from-rose-400/25 to-rose-500/5 text-rose-600 ring-1 ring-inset ring-rose-400/25 dark:text-rose-300",
    glow: "bg-rose-500/20",
    bar: "bg-gradient-to-r from-rose-500 to-rose-400",
    strip: "bg-gradient-to-r from-rose-500 via-rose-400 to-transparent",
    ring: "#f43f5e",
  },
  info: {
    tile: "bg-gradient-to-br from-blue-400/25 to-blue-500/5 text-blue-600 ring-1 ring-inset ring-blue-400/25 dark:text-blue-300",
    glow: "bg-blue-500/20",
    bar: "bg-gradient-to-r from-blue-500 to-blue-400",
    strip: "bg-gradient-to-r from-blue-500 via-blue-400 to-transparent",
    ring: "#3b82f6",
  },
  violet: {
    tile: "bg-gradient-to-br from-violet-400/25 to-violet-500/5 text-violet-600 ring-1 ring-inset ring-violet-400/25 dark:text-violet-300",
    glow: "bg-violet-500/20",
    bar: "bg-gradient-to-r from-violet-500 to-violet-400",
    strip: "bg-gradient-to-r from-violet-500 via-violet-400 to-transparent",
    ring: "#8b5cf6",
  },
};

function MiniRing({ percent, ring }) {
  const size = 46;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-slate-200/80 dark:text-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ring}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-slate-600 dark:text-slate-300">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

/**
 * Modern HRMS KPI card — tinted icon chip, large tabular value, an
 * optional share ring, and an ambient corner glow. Pass `to` to make it
 * a navigable tile (adds hover lift + arrow).
 */
export default function DashboardCard({
  title,
  value,
  icon,
  color = "primary",
  loading = false,
  percent,
  hint,
  to,
}) {
  const t = THEME[color] || THEME.primary;

  const body = (
    <>
      {/* top accent strip */}
      <span
        className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 ${t.strip}`}
        aria-hidden="true"
      />

      {/* ambient glow */}
      <div
        className={`pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-2xl ${t.glow}`}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${t.tile}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="mt-1 bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-[28px] font-bold leading-none tabular-nums text-transparent dark:from-white dark:to-slate-400">
            {loading ? "…" : value ?? 0}
          </p>
          {hint && (
            <p className="mt-1.5 truncate text-xs text-slate-400 dark:text-slate-500">
              {hint}
            </p>
          )}
        </div>

        {!loading && percent != null && <MiniRing percent={percent} ring={t.ring} />}
      </div>

      {/* progress rail (only when a share is known) */}
      {!loading && percent != null && (
        <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${t.bar}`}
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
      )}

      {to && (
        <span className="relative mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-400">
          View
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      )}
    </>
  );

  const className =
    "card group relative overflow-hidden p-5" +
    (to
      ? " cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-white/20"
      : "");

  return to ? (
    <Link to={to} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
