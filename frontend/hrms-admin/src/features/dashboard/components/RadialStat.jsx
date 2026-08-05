const COLOR_HEX = {
  primary: "#d4941f",
  accent: "#14b8a6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

// Large circular-progress card (percent-in-center ring) used for headline
// rates — e.g. attendance rate, leave approval rate — alongside a short
// caption describing the underlying counts.
export default function RadialStat({ title, percent, caption, color = "accent", loading }) {
  const size = 128;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent ?? 0));
  const offset = circumference - (clamped / 100) * circumference;
  const hex = COLOR_HEX[color] || COLOR_HEX.accent;

  return (
    <div className="card p-5 flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-100 dark:text-white/10" />
          {!loading && percent != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={hex}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-900 dark:text-white tabular-nums">
          {loading ? "…" : percent != null ? `${Math.round(percent)}%` : "—"}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{loading ? "Loading…" : caption}</p>
      </div>
    </div>
  );
}
