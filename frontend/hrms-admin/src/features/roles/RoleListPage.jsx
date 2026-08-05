import { useState } from "react";
import { useRoles, useCreateRole, useUpdateRole, useDeactivateRole } from "./useRoles";
import RoleForm from "./RoleForm";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import { rolesApi } from "@/api/roles.api";

const EXPORT_COLUMNS = [
  { header: "ID", accessor: (r) => r.id },
  { header: "Name", accessor: (r) => r.name },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

export default function RoleListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useRoles(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: rolesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "roles",
    title: "Roles",
  });

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deactivateRole = useDeactivateRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRole, setConfirmRole] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateRole.mutateAsync({ id: editing.id, payload });
        showToast("Role updated", "success");
      } else {
        await createRole.mutateAsync(payload);
        showToast("Role created", "success");
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRole) return;
    try {
      await deactivateRole.mutateAsync(confirmRole.id);
      showToast("Role deactivated", "success");
      setConfirmRole(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate", "error");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "actions", label: "Actions", render: (r) => r.actions || "-" },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <Badge className={r.is_active ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "ops",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(r)} className="text-primary-600 hover:underline text-sm">Edit</button>
          {r.is_active && (
            <button onClick={() => setConfirmRole(r)} className="text-red-600 hover:underline text-sm">Deactivate</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Roles</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage roles</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Button onClick={openCreate} className="w-full sm:w-auto">Add Role</Button>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search roles..." />
        </div>
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load roles.</div>}
        <DataTable columns={columns} data={data?.items || []} loading={isLoading} />
        <TablePagination
          page={page} pages={data?.pages || 1} total={data?.total || 0}
          perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Role" : "Add Role"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="role-form" isLoading={createRole.isPending || updateRole.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <RoleForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createRole.isPending || updateRole.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmRole}
        onClose={() => setConfirmRole(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Role"
        message={`Are you sure you want to deactivate "${confirmRole?.name}"?`}
        confirmText="Deactivate"
        loading={deactivateRole.isPending}
      />
    </div>
  );
}
