import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";
import { formatDate, formatTime } from "@/utils/formatDate";

const BREAK_EMOJI = {
  nap: "😴",
  lunch: "🍽️",
  tea: "☕",
  permission: "🚶",
};

function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// Compact "reasons & breaks" cell — surfaces every reason the employee
// entered (late login, permission, overtime) plus measured break minutes,
// so an admin reviewing everyone's attendance sees the why, not just the
// times.
function ReasonsCell({ row }) {
  const events = row.events || [];
  const notes = [];

  if (row.late_login_minutes > 0) {
    notes.push({
      key: "late",
      tag: `Late ${Math.round(row.late_login_minutes)}m`,
      text: row.late_login_reason || "—",
      cls: "text-amber-700 dark:text-amber-300",
    });
  }

  events
    .filter((e) => e.event_type === "check_out" && e.reason_type === "permission")
    .forEach((e, i) =>
      notes.push({
        key: `perm-${i}`,
        tag: `🚶 Permission ${fmtTime(e.event_time)}`,
        text: e.reason || "—",
        cls: "text-violet-700 dark:text-violet-300",
      })
    );

  if (row.overtime_hours > 0) {
    notes.push({
      key: "ot",
      tag: `OT ${Number(row.overtime_hours).toFixed(1)}h`,
      text: row.overtime_reason || "—",
      cls: "text-amber-700 dark:text-amber-300",
    });
  }

  const breakChips = ["lunch", "tea", "nap"]
    .map((t) => ({ t, m: Math.round(row[`${t}_minutes`] || 0) }))
    .filter((b) => b.m > 0);

  if (row.permission_over_limit) {
    notes.push({
      key: "over",
      tag: "⚠ Permission over limit",
      text: `${Math.round(row.permission_minutes || 0)}m taken`,
      cls: "text-rose-700 dark:text-rose-300",
    });
  }

  if (!notes.length && !breakChips.length) {
    return <span className="text-xs text-slate-300 dark:text-slate-600">—</span>;
  }

  return (
    <div className="w-full space-y-1">
      {notes.map((n) => (
        <p
          key={n.key}
          title={`${n.tag}: ${n.text}`}
          className={`whitespace-normal break-words text-[11px] leading-4 ${n.cls}`}
        >
          <span className="font-semibold">{n.tag}:</span>{" "}
          <span className="text-slate-600 dark:text-slate-300">{n.text}</span>
        </p>
      ))}

      {breakChips.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {breakChips.map((b) => (
            <span
              key={b.t}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
            >
              {BREAK_EMOJI[b.t]} {b.m}m
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AttendanceTable({ data, loading, sortBy, sortDir, onSort }) {
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) =>
        r.employee
          ? `${r.employee.first_name} ${r.employee.last_name}`.trim()
          : "-",
    },
    { key: "attendance_date", label: "Date", sortable: true, render: (r) => formatDate(r.attendance_date) },
    { key: "check_in", label: "Check In", sortable: true, render: (r) => formatTime(r.check_in) },
    { key: "check_out", label: "Check Out", sortable: true, render: (r) => formatTime(r.check_out) },
    {
      key: "working_hours",
      label: "Working Hours",
      sortable: true,
      render: (r) => (r.working_hours != null ? `${r.working_hours}h` : "-"),
    },
    {
      key: "reasons",
      label: "Reasons / Breaks",
      className: "w-[30%] align-top",
      render: (r) => <ReasonsCell row={r} />,
    },
    {
      key: "attendance_status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <div className="flex flex-col items-start gap-1">
          <Badge className={domainColors.attendanceStatus[r.attendance_status] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"}>
            {r.attendance_status}
          </Badge>
          {r.permission_over_limit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-inset ring-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/40">
              ⚠ Critical
            </span>
          )}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />;
}
