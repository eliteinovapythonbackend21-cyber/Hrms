import { Link } from "react-router-dom";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/utils/formatCurrency";

export default function EmployeeTable({ data, loading, onDeactivate, sortBy, sortDir, onSort }) {
  const columns = [
    { key: "employee_code", label: "Code", sortable: true },
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (r) => `${r.first_name || ""} ${r.last_name || ""}`.trim(),
    },
    {
      key: "department",
      label: "Department",
      render: (r) => r.department?.department_name || "-",
    },
    {
      key: "designation",
      label: "Designation",
      render: (r) => r.designation?.designation_name || "-",
    },
    {
      key: "salary",
      label: "Salary",
      sortable: true,
      render: (r) => formatCurrency(r.salary),
    },
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge
          className={
            r.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }
        >
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <Link to={`/employees/${r.id}`} className="text-primary-600 hover:underline text-sm">
            View
          </Link>
          <Link to={`/employees/${r.id}/edit`} className="text-primary-600 hover:underline text-sm">
            Edit
          </Link>
          <Link to={`/employees/${r.id}/salary`} className="text-primary-600 hover:underline text-sm">
            Salary
          </Link>
          <Link to={`/employees/${r.id}/payslip`} className="text-primary-600 hover:underline text-sm">
            Payslip
          </Link>
          {r.is_active && (
            <button
              onClick={() => onDeactivate?.(r)}
              className="text-red-600 hover:underline text-sm"
            >
              Deactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />;
}
