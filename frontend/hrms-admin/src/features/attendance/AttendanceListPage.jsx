import { Link } from "react-router-dom";

import { useAttendance } from "./useAttendance";
import AttendanceTable from "./components/AttendanceTable";
import CheckInOutWidget from "./CheckInOutWidget";

import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";

import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import Button from "@/components/ui/Button";

import { getUser } from "@/utils/tokenHelpers";
import { attendanceApi } from "@/api/attendance.api";
import { formatDate, formatTime } from "@/utils/formatDate";

/*
 * ============================================================
 * EXPORT COLUMNS
 * ============================================================
 */

const EXPORT_COLUMNS = [
  {
    header: "Employee",
    accessor: (row) =>
      row.employee
        ? `${row.employee.first_name || ""} ${
            row.employee.last_name || ""
          }`.trim()
        : row.employee_name || null,
  },

  {
    header: "Employee Code",
    accessor: (row) =>
      row.employee?.employee_code ||
      row.employee_code ||
      null,
  },

  {
    header: "Date",
    accessor: (row) =>
      formatDate(row.attendance_date),
  },

  {
    header: "Check In",
    accessor: (row) =>
      formatTime(row.check_in),
  },

  {
    header: "Check Out",
    accessor: (row) =>
      formatTime(row.check_out),
  },

  {
    header: "Working Hours",
    accessor: (row) =>
      row.working_hours != null
        ? `${row.working_hours}h`
        : null,
  },

  {
    header: "Status",
    accessor: (row) =>
      row.attendance_status,
  },
];

/*
 * ============================================================
 * STATUS HELPERS
 * ============================================================
 */

const getStatusValue = (row) => {
  return String(
    row?.attendance_status ||
      row?.status ||
      ""
  ).toLowerCase();
};

const isPresent = (row) => {
  const status = getStatusValue(row);

  return (
    status === "present" ||
    status === "checked in" ||
    status === "checked-in"
  );
};

const isAbsent = (row) => {
  return getStatusValue(row) === "absent";
};

const isLeave = (row) => {
  const status = getStatusValue(row);

  return (
    status === "leave" ||
    status === "on leave"
  );
};

const isLate = (row) => {
  const status = getStatusValue(row);

  return (
    status === "late" ||
    status === "late arrival"
  );
};

/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

export default function AttendanceListPage() {
  /*
   * ----------------------------------------------------------
   * PAGINATION
   * ----------------------------------------------------------
   */

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
    sortBy,
    sortDir,
    toggleSort,
  } = usePagination();

  /*
   * ----------------------------------------------------------
   * USER / ROLE
   * ----------------------------------------------------------
   */

  const user = getUser();

  const isAdmin =
    user?.role === "admin";

  /*
   * ----------------------------------------------------------
   * QUERY PARAMS
   * ----------------------------------------------------------
   *
   * Admin:
   *   - sees all attendance
   *
   * Employee:
   *   - sees only their own attendance
   */

  const queryParams = {
    ...params,

    employee_id:
      !isAdmin &&
      user?.employee?.id
        ? user.employee.id
        : undefined,
  };

  /*
   * ----------------------------------------------------------
   * ATTENDANCE QUERY
   * ----------------------------------------------------------
   */

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useAttendance(queryParams);

  /*
   * ----------------------------------------------------------
   * EXPORT
   * ----------------------------------------------------------
   */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: attendanceApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "attendance",
    title: "Attendance",
  });

  /*
   * ----------------------------------------------------------
   * DATA
   * ----------------------------------------------------------
   */

  const attendanceItems =
    data?.items || [];

  /*
   * ----------------------------------------------------------
   * ATTENDANCE SUMMARY
   * ----------------------------------------------------------
   *
   * These cards are specifically for HR daily attendance.
   * They do not contain Finance salary information.
   */

  const totalRecords =
    data?.total ??
    attendanceItems.length;

  const presentCount =
    attendanceItems.filter(
      isPresent
    ).length;

  const absentCount =
    attendanceItems.filter(
      isAbsent
    ).length;

  const leaveCount =
    attendanceItems.filter(
      isLeave
    ).length;

  const lateCount =
    attendanceItems.filter(
      isLate
    ).length;

  /*
   * ----------------------------------------------------------
   * PRESENT PERCENTAGE
   * ----------------------------------------------------------
   */

  const attendanceRate =
    totalRecords > 0
      ? Math.round(
          (presentCount /
            totalRecords) *
            100
        )
      : 0;

  /*
   * ==========================================================
   * EMPLOYEE VIEW
   * ==========================================================
   *
   * Normal employees should not see the HR attendance
   * management table.
   */

  if (!isAdmin) {
    return (
      <div className="min-h-full space-y-6">
        {/* ----------------------------------------------------
            EMPLOYEE HEADER
        ----------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  <svg
                    className="h-6 w-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect
                      x="3"
                      y="4"
                      width="18"
                      height="17"
                      rx="2"
                    />

                    <path d="M8 2v4M16 2v4M3 9h18" />

                    <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01" />
                  </svg>
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    My Attendance
                  </h1>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Manage your daily check-in and
                    check-out
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            CHECK IN / OUT
        ----------------------------------------------------- */}

        <CheckInOutWidget />

        {/* ----------------------------------------------------
            EMPLOYEE RECENT ATTENDANCE
        ----------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recent Attendance
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Your latest attendance records
            </p>
          </div>

          {isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              Failed to load attendance records.
            </div>
          ) : (
            <AttendanceTable
              data={attendanceItems}
              loading={isLoading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={toggleSort}
            />
          )}
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * HR / ADMIN VIEW
   * ==========================================================
   */

  return (
    <div className="min-h-full space-y-6">
      {/* ======================================================
          PAGE HEADER
      ======================================================= */}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                  />

                  <path d="M8 2v4M16 2v4M3 9h18" />

                  <path d="M8 13h.01M12 13h.01M16 13h.01" />

                  <path d="M8 17h8" />
                </svg>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Attendance
                  </h1>

                  {isFetching && (
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      Updating
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Monitor today's employee attendance
                  and work status
                </p>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------
              ACTIONS
          --------------------------------------------------- */}

          <div className="flex flex-wrap items-center gap-2">
            <TableToolbar
              onRefresh={refetch}
              refreshing={isFetching}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              exporting={exporting}
            />

            <Link to="/attendance/manual">
              <Button variant="secondary">
                Manual Entry
              </Button>
            </Link>

            <Link to="/attendance/reports">
              <Button>
                Reports
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================
          ATTENDANCE SNAPSHOT
      ======================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AttendanceMetric
          label="Total Records"
          value={totalRecords}
          description="Attendance records"
          icon="users"
        />

        <AttendanceMetric
          label="Present"
          value={presentCount}
          description="Employees present"
          icon="present"
        />

        <AttendanceMetric
          label="Absent"
          value={absentCount}
          description="Employees absent"
          icon="absent"
        />

        <AttendanceMetric
          label="On Leave"
          value={leaveCount}
          description="Approved leave"
          icon="leave"
        />

        <AttendanceMetric
          label="Late"
          value={lateCount}
          description="Late arrivals"
          icon="late"
        />
      </div>

      {/* ======================================================
          ATTENDANCE HEALTH
      ======================================================= */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ----------------------------------------------------
            ATTENDANCE RATE
        ----------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attendance Rate
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {attendanceRate}%
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              %
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  attendanceRate,
                  100
                )}%`,
              }}
            />
          </div>

          <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {presentCount} present
            </span>

            <span>
              {totalRecords} records
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------
            DAILY STATUS
        ----------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Today's Status
          </p>

          <div className="mt-4 space-y-3">
            <StatusRow
              label="Present"
              value={presentCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (presentCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="present"
            />

            <StatusRow
              label="Absent"
              value={absentCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (absentCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="absent"
            />

            <StatusRow
              label="Leave"
              value={leaveCount}
              percentage={
                totalRecords
                  ? Math.round(
                      (leaveCount /
                        totalRecords) *
                        100
                    )
                  : 0
              }
              type="leave"
            />
          </div>
        </div>

        {/* ----------------------------------------------------
            QUICK ACTIONS
        ----------------------------------------------------- */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Attendance Tools
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              to="/attendance/manual"
              className="group rounded-xl border border-slate-200 p-3 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:hover:border-primary-700 dark:hover:bg-primary-500/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-primary-500/10 dark:group-hover:text-primary-400">
                +
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">
                Manual Entry
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                Add attendance
              </p>
            </Link>

            <Link
              to="/attendance/reports"
              className="group rounded-xl border border-slate-200 p-3 transition hover:border-primary-300 hover:bg-primary-50 dark:border-slate-700 dark:hover:border-primary-700 dark:hover:bg-primary-500/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-primary-500/10 dark:group-hover:text-primary-400">
                ↗
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-white">
                Reports
              </p>

              <p className="mt-0.5 text-[11px] text-slate-400">
                View reports
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================
          ATTENDANCE TABLE
      ======================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* ----------------------------------------------------
            TABLE HEADER
        ----------------------------------------------------- */}

        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-700">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Attendance Records
                </h2>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {totalRecords}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Employee check-in, check-out and daily
                attendance status
              </p>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            ERROR
        ----------------------------------------------------- */}

        {isError && (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                Unable to load attendance.
              </span>

              <button
                type="button"
                onClick={() => refetch()}
                className="font-medium underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            TABLE
        ----------------------------------------------------- */}

        <div className="overflow-x-auto">
          <AttendanceTable
            data={attendanceItems}
            loading={isLoading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        </div>

        {/* ----------------------------------------------------
            PAGINATION
        ----------------------------------------------------- */}

        <div className="border-t border-slate-200 dark:border-slate-700">
          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * ATTENDANCE METRIC
 * ============================================================
 */

function AttendanceMetric({
  label,
  value,
  description,
  icon,
}) {
  const iconStyles = {
    users:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",

    present:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",

    absent:
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",

    leave:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",

    late:
      "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  };

  const icons = {
    users: "●",

    present: "✓",

    absent: "×",

    leave: "◐",

    late: "◷",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${iconStyles[icon]}`}
        >
          {icons[icon]}
        </div>
      </div>
    </div>
  );
}

/*
 * ============================================================
 * STATUS ROW
 * ============================================================
 */

function StatusRow({
  label,
  value,
  percentage,
  type,
}) {
  const barStyles = {
    present: "bg-emerald-500",
    absent: "bg-red-500",
    leave: "bg-amber-500",
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {label}
        </span>

        <span className="text-xs font-semibold text-slate-800 dark:text-white">
          {value}
          <span className="ml-1 font-normal text-slate-400">
            ({percentage}%)
          </span>
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barStyles[type]}`}
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}