import { Link } from "react-router-dom";
import { useAttendance } from "@/features/attendance/useAttendance";
import { formatDate, formatTime } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

function statusLabel(row) {
  return row?.attendance_status || row?.status || "—";
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
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </h3>
        <Link
          to="/attendance"
          className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          View all
        </Link>
      </div>

      {!employeeId ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400 text-center px-4">
          No employee record is linked to your account yet — ask an admin to link one.
        </div>
      ) : isLoading ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-slate-400">
          No attendance records yet
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <th className="font-medium px-5 py-2">Date</th>
                <th className="font-medium px-5 py-2">Check-in</th>
                <th className="font-medium px-5 py-2">Check-out</th>
                <th className="font-medium px-5 py-2">Working hours</th>
                <th className="font-medium px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id || r.attendance_date}
                  className="border-b border-slate-100 dark:border-white/5 last:border-0"
                >
                  <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {formatDate(r.attendance_date)}
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">
                    {r.check_in ? formatTime(r.check_in) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">
                    {r.check_out ? formatTime(r.check_out) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400">
                    {r.working_hours != null ? `${r.working_hours}h` : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-slate-500 dark:text-slate-400 capitalize">
                    {statusLabel(r)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
