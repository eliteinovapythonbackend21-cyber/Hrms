import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";
import { formatDate, formatTime } from "@/utils/formatDate";

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
      key: "attendance_status",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge className={domainColors.attendanceStatus[r.attendance_status] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"}>
          {r.attendance_status}
        </Badge>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />;
}
