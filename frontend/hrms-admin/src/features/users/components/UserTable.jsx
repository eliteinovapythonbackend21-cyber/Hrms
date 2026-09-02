import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { domainColors } from "@/theme/tokens/domainColors";
import { Motion3DStyles } from "@/hooks/use3DMotion";

// Add-only: View/Edit/Deactivate removed entirely, not permission-gated.
export default function UserTable({ data, loading, sortBy, sortDir, onSort }) {
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
        <Badge className={`${roleStyle(r.role)} transition-transform duration-200 hover:scale-105`}>{r.role}</Badge>
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
              ? "inline-flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "inline-flex items-center gap-1.5 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? "bg-emerald-500 u-pulse" : "bg-red-500"}`} />
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <Motion3DStyles />
      <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
    </>
  );
}
