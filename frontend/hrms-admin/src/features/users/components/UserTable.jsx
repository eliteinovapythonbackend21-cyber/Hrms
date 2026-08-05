import { Link } from "react-router-dom";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";

export default function UserTable({ data, loading, onDeactivate, sortBy, sortDir, onSort }) {
  const roleStyle = (role) =>
    domainColors.role[role] || "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300";

  const columns = [
    { key: "id", label: "ID", sortable: true },
    { key: "username", label: "Username", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "mobile", label: "Mobile", render: (r) => r.mobile || "-" },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (r) => (
        <Badge className={roleStyle(r.role)}>{r.role}</Badge>
      ),
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
          <Link
            to={`/users/${r.id}`}
            className="text-primary-600 hover:underline text-sm"
          >
            View
          </Link>
          <Link
            to={`/users/${r.id}/edit`}
            className="text-primary-600 hover:underline text-sm"
          >
            Edit
          </Link>
          {r.is_active && r.role !== "admin" && (
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
