import { useState } from "react";
import { Link } from "react-router-dom";
import { useAttendance } from "./useAttendance";
import { useMonthlyAttendance } from "./useMonthlyAttendance";
import AttendanceTable from "./components/AttendanceTable";
import AttendanceMonthlySummaryTable from "./components/AttendanceMonthlySummaryTable";
import CheckInOutWidget from "./CheckInOutWidget";
import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import Button from "@/components/ui/Button";
import { getUser } from "@/utils/tokenHelpers";
import { attendanceApi } from "@/api/attendance.api";
import { formatDate, formatTime } from "@/utils/formatDate";

const EXPORT_COLUMNS = [
  { header: "Employee", accessor: (r) => (r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : null) },
  { header: "Date", accessor: (r) => formatDate(r.attendance_date) },
  { header: "Check In", accessor: (r) => formatTime(r.check_in) },
  { header: "Check Out", accessor: (r) => formatTime(r.check_out) },
  { header: "Working Hours", accessor: (r) => (r.working_hours != null ? `${r.working_hours}h` : null) },
  { header: "Status", accessor: (r) => r.attendance_status },
];

export default function AttendanceListPage() {
  const { params, page, perPage, setPage, setPerPage, sortBy, sortDir, toggleSort } = usePagination();
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const isFinance = user?.role === "finance";

  // ---- Finance: monthly summary view ----
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data: monthlyData, isLoading: monthlyLoading, isFetching: monthlyFetching, refetch: refetchMonthly } =
    useMonthlyAttendance(month, year);

  // ---- Admin: daily table view (unchanged) ----
  const queryParams = {
    ...params,
    employee_id: !isAdmin && user?.employee?.id ? user.employee.id : undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useAttendance(queryParams, {
    enabled: isAdmin,
  });

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: attendanceApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "attendance",
    title: "Attendance",
  });

  // ---- Finance: monthly view ----
  if (isFinance) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance — Monthly</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Monthly attendance and salary-impact summary
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TableToolbar onRefresh={refetchMonthly} refreshing={monthlyFetching} />
            <input
              type="month"
              value={`${year}-${String(month).padStart(2, "0")}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-");
                setYear(Number(y));
                setMonth(Number(m));
              }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="card">
          <AttendanceMonthlySummaryTable
            data={monthlyData?.items || []}
            loading={monthlyLoading}
          />
        </div>
      </div>
    );
  }

  // ---- Employee / other roles: check-in widget (unchanged) ----
  if (!isAdmin) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Check in and check out for today
          </p>
        </div>
        <CheckInOutWidget />
      </div>
    );
  }

  // ---- Admin: daily table (unchanged) ----
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View attendance records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Link to="/attendance/manual">
            <Button variant="secondary">Manual Entry</Button>
          </Link>
          <Link to="/attendance/reports">
            <Button>Reports</Button>
          </Link>
        </div>
      </div>

      <div className="card">
        {isError && (
          <div className="p-4 text-red-600 dark:text-red-400">Failed to load attendance.</div>
        )}
        <AttendanceTable data={data?.items || []} loading={isLoading} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
  );
}