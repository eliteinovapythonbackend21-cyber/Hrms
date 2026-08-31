import { Link } from "react-router-dom";
import { useAttendance } from "@/features/attendance/useAttendance";
import { formatDate, formatTime } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

function statusMeta(row) {
  const raw = String(row?.attendance_status || row?.status || "").toLowerCase();
  if (raw.includes("present") || raw.includes("checked")) return { cls: "pill-success", text: "Present", accent: "bg-emerald-500" };
  if (raw.includes("leave")) return { cls: "pill-warn", text: "Leave", accent: "bg-amber-500" };
  if (raw.includes("absent")) return { cls: "pill-danger", text: "Absent", accent: "bg-red-500" };
  if (raw.includes("late")) return { cls: "pill-warn", text: "Late", accent: "bg-amber-500" };
  return { cls: "pill-muted", text: row?.attendance_status || row?.status || "—", accent: "bg-slate-400" };
}

export default function MyRecentAttendance({
  title = "Your recent check-in / check-out",
}) {
  const user = getUser();
  const employeeId = user?.employee?.id;

  const { data, isLoading } = useAttendance(
    {
      employee_id: employeeId,
      page: 1,
      per_page: 7,
      sort_by: "attendance_date",
      sort_dir: "desc",
    },
    { enabled: !!employeeId }
  );

  const rows = data?.items || [];

  return (
    <div className="card-elevated p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h3>
        <Link
          to="/attendance"
          className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          View all
        </Link>
      </div>

      {!employeeId ? (
        <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-slate-400">
          No employee record is linked to your account yet — ask an admin to link one.
        </div>
      ) : isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-400">
          No attendance records yet
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => {
            const s = statusMeta(r);
            return (
              <div key={r.id || r.attendance_date} className="data-row">
                <span className={`h-8 w-1 shrink-0 rounded-full ${s.accent}`} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatDate(r.attendance_date)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {r.check_in ? formatTime(r.check_in) : "—"}
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">→</span>
                    {r.check_out ? formatTime(r.check_out) : "—"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {r.working_hours != null ? `${r.working_hours}h` : "—"}
                  </p>
                  <span className={`pill ${s.cls} mt-1`}>{s.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
