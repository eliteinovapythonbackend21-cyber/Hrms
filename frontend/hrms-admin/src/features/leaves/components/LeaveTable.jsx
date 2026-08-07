import { Link } from "react-router-dom";
import DataTable from "@/components/table/DataTable";
import LeaveStatusBadge from "./LeaveStatusBadge";
import { formatDate } from "@/utils/formatDate";

// Leaves is an add-only transactional list — no Edit/Delete, only Add
// (Request Leave) + the Approvals workflow action for admin. Edit/Delete
// provisioning lives exclusively under Admin > Roles & Permissions for the
// screens that support it; Leaves isn't one of them.
export default function LeaveTable({ data, loading, isAdmin, sortBy, sortDir, onSort }) {
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) =>
        r.employee
          ? `${r.employee.first_name} ${r.employee.last_name}`.trim()
          : "-",
    },
    {
      key: "leave_type",
      label: "Leave Type",
      render: (r) => r.leave_type?.name || "-",
    },
    { key: "from_date", label: "From", sortable: true, render: (r) => formatDate(r.from_date) },
    { key: "to_date", label: "To", sortable: true, render: (r) => formatDate(r.to_date) },
    { key: "total_days", label: "Days", sortable: true },
    { key: "reason", label: "Reason", render: (r) => r.reason || "-" },
    { key: "status", label: "Status", sortable: true, render: (r) => <LeaveStatusBadge status={r.status} /> },
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        isAdmin && r.status === "Pending" ? (
          <Link to="/leaves/approvals" className="text-green-600 hover:underline text-sm">
            Review
          </Link>
        ) : (
          "-"
        ),
    },
  ];

  return <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />;
}
