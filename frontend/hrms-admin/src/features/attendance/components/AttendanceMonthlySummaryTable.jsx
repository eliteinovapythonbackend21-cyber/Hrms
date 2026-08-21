import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AttendanceMonthlySummaryTable({
  data,
  loading,
}) {
  const getLeaveDeduction = (row) =>
    Number(row.leave_deduction || 0);

  const getAbsentDeduction = (row) =>
    Number(row.absent_deduction || 0);

  const getTotalDeduction = (row) => {
    if (row.total_deduction != null) {
      return Number(row.total_deduction);
    }

    return (
      getLeaveDeduction(row) +
      getAbsentDeduction(row)
    );
  };

  const columns = [
    {
      key: "employee_name",
      label: "Employee",
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-800 dark:text-white">
            {row.employee_name || "-"}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {row.employee_code || "-"}
          </p>
        </div>
      ),
    },

    {
      key: "present_days",
      label: "Present",
      render: (row) => (
        <span className="font-semibold text-emerald-600">
          {row.present_days ?? 0}
        </span>
      ),
    },

    {
      key: "absent_days",
      label: "Absent",
      render: (row) => (
        <span className="font-semibold text-red-600">
          {row.absent_days ?? 0}
        </span>
      ),
    },

    {
      key: "approved_leave_days",
      label: "Leave",
      render: (row) => (
        <span className="font-semibold text-amber-600">
          {row.approved_leave_days ?? 0}
        </span>
      ),
    },

    {
      key: "paid_leave_days",
      label: "Paid Leave",
      render: (row) => (
        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {row.paid_leave_days ?? 0}
        </Badge>
      ),
    },

    {
      key: "unpaid_leave_days",
      label: "Unpaid Leave",
      render: (row) => (
        <Badge className="bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
          {row.unpaid_leave_days ?? 0}
        </Badge>
      ),
    },

    {
      key: "government_holiday_days",
      label: "Government",
      render: (row) => (
        <Badge className="bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
          {row.government_holiday_days ?? 0}
        </Badge>
      ),
    },

    {
      key: "office_holiday_days",
      label: "Office Holiday",
      render: (row) => (
        <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
          {row.office_holiday_days ?? 0}
        </Badge>
      ),
    },

    {
      key: "worked_hours",
      label: "Worked Hours",
      render: (row) =>
        `${Number(
          row.worked_hours || 0
        ).toFixed(2)}h`,
    },

    {
      key: "leave_deduction",
      label: "Leave Deduction",
      render: (row) => (
        <span className="font-semibold text-orange-600 dark:text-orange-400">
          {formatCurrency(
            getLeaveDeduction(row)
          )}
        </span>
      ),
    },

    {
      key: "absent_deduction",
      label: "Absent Deduction",
      render: (row) => (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {formatCurrency(
            getAbsentDeduction(row)
          )}
        </span>
      ),
    },

    {
      key: "total_deduction",
      label: "Total Deduction",
      render: (row) => (
        <span className="font-bold text-red-700 dark:text-red-400">
          {formatCurrency(
            getTotalDeduction(row)
          )}
        </span>
      ),
    },

    {
      key: "net_salary",
      label: "Net Salary",
      render: (row) => (
        <span className="font-bold text-slate-900 dark:text-white">
          {formatCurrency(
            row.net_salary || 0
          )}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
    />
  );
}