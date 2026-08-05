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

  const queryParams = {
    ...params,
    employee_id: !isAdmin && user?.employee?.id ? user.employee.id : undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useAttendance(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: attendanceApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "attendance",
    title: "Attendance",
  });

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
