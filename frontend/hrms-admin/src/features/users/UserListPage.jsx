import { useState } from "react";
import { Link } from "react-router-dom";
import { useUsers, useDeactivateUser } from "./useUsers";
import UserTable from "./components/UserTable";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import Button from "@/components/ui/Button";
import { usersApi } from "@/api/users.api";

const EXPORT_COLUMNS = [
  { header: "ID", accessor: (r) => r.id },
  { header: "Username", accessor: (r) => r.username },
  { header: "Email", accessor: (r) => r.email },
  { header: "Mobile", accessor: (r) => r.mobile },
  { header: "Role", accessor: (r) => r.role },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

export default function UserListPage({ role }) {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage, sortBy, sortDir, toggleSort } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    role: role || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useUsers(queryParams);
  const deactivate = useDeactivateUser();

  const [confirmUser, setConfirmUser] = useState(null);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: usersApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "users",
    title: "Users",
  });

  const handleDeactivate = async () => {
    if (!confirmUser) return;
    try {
      await deactivate.mutateAsync(confirmUser.id);
      showToast("User deactivated", "success");
      setConfirmUser(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate user", "error");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {role === "admin" ? "Admins" : role === "employee" ? "Employees" : "Users"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {role === "admin" ? "Manage admin accounts" : role === "employee" ? "Manage employee accounts" : "Manage user accounts"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Link to="/users/new">
            <Button className="w-full sm:w-auto">Add User</Button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search users..." />
        </div>

        {isError && (
          <div className="p-4 text-red-600 dark:text-red-400">Failed to load users.</div>
        )}

        <UserTable
          data={data?.items || []}
          loading={isLoading}
          onDeactivate={setConfirmUser}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
        />

        <TablePagination
          page={page}
          pages={data?.pages || 1}
          total={data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>

      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={handleDeactivate}
        title="Deactivate User"
        message={`Are you sure you want to deactivate "${confirmUser?.username}"?`}
        confirmText="Deactivate"
        loading={deactivate.isPending}
      />
    </div>
  );
}
