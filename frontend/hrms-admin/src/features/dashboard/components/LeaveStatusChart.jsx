import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = {
  Pending: "#f59e0b",
  Approved: "#22c55e",
  Rejected: "#ef4444",
};

export default function LeaveStatusChart({ data, loading, title = "Leave requests by status" }) {
  const rows = data || [];
  const total = rows.reduce((sum, d) => sum + (d.count || 0), 0);

  return (
    <div className="card-elevated p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {loading ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">Loading…</div>
      ) : total === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-slate-400">No leave requests yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <PieChart>
            <Pie data={rows} dataKey="count" nameKey="status" innerRadius={55} outerRadius={80} paddingAngle={3}>
              {rows.map((entry) => (
                <Cell key={entry.status} fill={COLORS[entry.status] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--color-text)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span style={{ color: "var(--color-muted)" }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
