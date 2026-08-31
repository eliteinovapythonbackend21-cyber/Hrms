import { Link } from "react-router-dom";
import { useAttendance } from "@/features/attendance/useAttendance";
import { toDateInputValue, formatTime } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

function Tile({ label, value, tint }) {
  return (
    <div className={`stat-tile ${tint}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default function MyStatusSummary() {
  const user = getUser();
  const employeeId = user?.employee?.id;
  const today = toDateInputValue(new Date());

  const { data, isLoading } = useAttendance(
    { employee_id: employeeId, attendance_date: today },
    { enabled: !!employeeId }
  );
  const record = data?.items?.[0];

  const checkedIn = !!record?.check_in;
  const checkedOut = !!record?.check_out;
  const statusPill = checkedOut
    ? { cls: "pill-muted", text: "Checked out" }
    : checkedIn
    ? { cls: "pill-success", text: "Checked in" }
    : { cls: "pill-warn", text: "Not checked in" };

  return (
    <div className="card-elevated overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-44 w-44 rounded-full bg-accent-500/10 blur-3xl" />

      <div className="relative p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-500/15 bg-primary-500/10 text-primary-600 dark:text-primary-300">
              <ClockIcon />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Today
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {employeeId && !isLoading && (
            <span className={`pill ${statusPill.cls}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusPill.text}
            </span>
          )}
        </div>

        {!employeeId ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No employee record is linked to your account yet — ask an admin to link one.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile
              label="Check-in"
              value={record?.check_in ? formatTime(record.check_in) : "—"}
              tint="stat-tile-accent"
            />
            <Tile
              label="Check-out"
              value={record?.check_out ? formatTime(record.check_out) : "—"}
              tint="stat-tile-primary"
            />
            <Tile
              label="Working hours"
              value={record?.working_hours != null ? `${record.working_hours}h` : "—"}
              tint="stat-tile-success"
            />
          </div>
        )}

        <Link
          to="/attendance"
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Go to check-in / check-out →
        </Link>
      </div>
    </div>
  );
}
