import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

export default function AttendanceTrendChart({ data, loading, title = "Check-ins — last 7 days" }) {
  const chartData = (data || []).map((d) => ({ ...d, label: dayLabel(d.date) }));
  const today = chartData.length ? chartData[chartData.length - 1].date : null;

  return (
    <div className="card-elevated p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="28%">
            <defs>
              <linearGradient id="checkinFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity={1} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.35} />
              </linearGradient>
              <linearGradient id="checkinFillToday" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d4941f" stopOpacity={1} />
                <stop offset="100%" stopColor="#d4941f" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--color-muted)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--color-muted)" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              cursor={{ fill: "var(--color-border)", opacity: 0.3 }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--color-text)",
              }}
              labelStyle={{ color: "var(--color-text)" }}
            />
            <Bar dataKey="count" name="Check-ins" radius={[6, 6, 0, 0]} maxBarSize={36}>
              {chartData.map((d) => (
                <Cell key={d.date} fill={d.date === today ? "url(#checkinFillToday)" : "url(#checkinFill)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
