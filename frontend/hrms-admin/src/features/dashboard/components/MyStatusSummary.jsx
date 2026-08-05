import { Link } from "react-router-dom";
import { useAttendance } from "@/features/attendance/useAttendance";
import { toDateInputValue, formatTime } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

export default function MyStatusSummary() {
  const user = getUser();
  const employeeId = user?.employee?.id;
  const today = toDateInputValue(new Date());

  const { data, isLoading } = useAttendance(
    { employee_id: employeeId, attendance_date: today },
    { enabled: !!employeeId }
  );
  const record = data?.items?.[0];

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Today</h3>

      {!employeeId ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No employee record is linked to your account yet — ask an admin to link one.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Check-in</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {record?.check_in ? formatTime(record.check_in) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Check-out</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {record?.check_out ? formatTime(record.check_out) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Working hours</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {record?.working_hours != null ? `${record.working_hours}h` : "—"}
            </p>
          </div>
        </div>
      )}

      <Link
        to="/attendance"
        className="inline-block mt-5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
      >
        Go to check-in / check-out →
      </Link>
    </div>
  );
}
