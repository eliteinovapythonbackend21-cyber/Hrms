import DataTable from "@/components/table/DataTable";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AttendanceMonthlySummaryTable({ data, loading }) {
  const columns = [
    { key: "employee_name", label: "Employee", render: (r) => r.employee_name || "-" },
    { key: "employee_code", label: "Code" },
    { key: "present_days", label: "Present" },
    { key: "absent_days", label: "Absent" },
    { key: "approved_leave_days", label: "Leave" },
    { key: "holiday_days", label: "Holidays", render: (r) => r.holiday_days ?? 0 },
    { key: "worked_hours", label: "Hours", render: (r) => `${r.worked_hours ?? 0}h` },
    { key: "absent_deduction", label: "Deduction", render: (r) => formatCurrency(r.absent_deduction) },
    { key: "net_salary", label: "Net Salary", render: (r) => formatCurrency(r.net_salary) },
  ];
  return <DataTable columns={columns} data={data} loading={loading} />;
}