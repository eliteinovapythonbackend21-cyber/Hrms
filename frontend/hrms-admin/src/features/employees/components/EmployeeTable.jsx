import { Link } from "react-router-dom";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/utils/formatCurrency";

// Employees is view-mostly: View, Salary, Payslip only. No Edit/Deactivate
// anywhere — not gated by the permission matrix, removed entirely (matches
// the Leaves list's add-only-without-delete treatment).
//
// Column count kept tight on purpose: Company/Branch and Department/
// Designation are each merged into one stacked two-line cell instead of
// four separate columns, and custom cell text runs smaller (text-xs) —
// keeps the whole table inside the card width without a horizontal
// scrollbar on typical desktop widths.
export default function EmployeeTable({ data, loading, sortBy, sortDir, onSort }) {
  const columns = [
    { key: "employee_code", label: "Code", sortable: true },
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (r) => (
        <span className="text-sm">
          {`${r.first_name || ""} ${r.last_name || ""}`.trim()}
        </span>
      ),
    },
    {
      key: "company_branch",
      label: "Company / Branch",
      render: (r) => (
        <div className="min-w-0 text-xs leading-tight">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {r.department?.company?.name || "-"}
          </p>
          <p className="truncate text-slate-400">
            {r.department?.branch?.name || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "department_designation",
      label: "Department / Designation",
      render: (r) => (
        <div className="min-w-0 text-xs leading-tight">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {r.department?.department_name || "-"}
          </p>
          <p className="truncate text-slate-400">
            {r.designation?.designation_name || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "salary",
      label: "Salary",
      sortable: true,
      render: (r) => (
        <span className="whitespace-nowrap text-xs">
          {formatCurrency(r.salary)}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge
          className={`text-xs ${
            r.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }`}
        >
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Link to={`/employees/${r.id}`} className="text-xs text-primary-600 hover:underline">
            View
          </Link>
          <Link to={`/employees/${r.id}/salary`} className="text-xs text-primary-600 hover:underline">
            Salary
          </Link>
          <Link to={`/employees/${r.id}/payslip`} className="text-xs text-primary-600 hover:underline">
            Payslip
          </Link>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />;
}