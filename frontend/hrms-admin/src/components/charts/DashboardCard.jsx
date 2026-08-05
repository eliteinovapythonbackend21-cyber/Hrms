const colorMap = {
  primary: "bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
  accent: "bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300",
  success: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
};

const barMap = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

const ringStrokeMap = {
  primary: "#d4941f",
  accent: "#14b8a6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

// Small donut ring showing `percent` (0-100) filled in the card's color.
function MiniRing({ percent, color }) {
  const size = 44;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-100 dark:text-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringStrokeMap[color]}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

// Reusable card for dashboard summary counts. `percent` (0-100) draws an
// optional donut ring — pass it when the value has a meaningful share of a
// known total (e.g. present-today out of total employees).
export default function DashboardCard({
  title,
  value,
  icon,
  color = "primary",
  loading = false,
  percent,
}) {
  return (
    <div className="card relative overflow-hidden p-5 flex items-center gap-4">
      <span className={`absolute inset-x-0 top-0 h-1 ${barMap[color]}`} aria-hidden="true" />
      <div
        className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{title}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {loading ? "…" : value ?? 0}
        </p>
      </div>
      {!loading && percent != null && <MiniRing percent={percent} color={color} />}
    </div>
  );
}
