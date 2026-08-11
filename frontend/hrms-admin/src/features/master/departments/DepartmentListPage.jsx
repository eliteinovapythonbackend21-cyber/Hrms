import { useState } from "react";
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeactivateDepartment } from "./useDepartments";
import DepartmentForm from "./DepartmentForm";
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
import { masterApi } from "@/api/master.api";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const EXPORT_COLUMNS = [
  { header: "Code", accessor: (r) => r.department_code },
  { header: "Name", accessor: (r) => r.department_name },
  { header: "Description", accessor: (r) => r.description },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

export default function DepartmentListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useDepartments(queryParams);
  const { canAdd, canEdit, canDelete } = useModulePermissions("Departments");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: masterApi.listDepartments,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "departments",
    title: "Departments",
  });

  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deactivateDept = useDeactivateDepartment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateDept.mutateAsync({ id: editing.id, payload });
        showToast("Department updated", "success");
      } else {
        await createDept.mutateAsync(payload);
        showToast("Department created", "success");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateDept.mutateAsync(confirmRow.id);
      showToast("Department deactivated", "success");
      setConfirmRow(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const columns = [
    { key: "department_code", label: "Code" },
    { key: "department_name", label: "Name" },
    { key: "description", label: "Description", render: (r) => r.description || "-" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Badge className={r.is_active ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
            {r.is_active ? "Active" : "Inactive"}
          </Badge>
          {canEdit && (
            <button onClick={() => openEdit(r)} className="text-primary-600 hover:underline text-sm">Edit</button>
          )}
          {r.is_active && canDelete && (
            <button onClick={() => setConfirmRow(r)} className="text-red-600 hover:underline text-sm">Deactivate</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage departments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          {canAdd && (
            <Button onClick={openAdd} className="w-full sm:w-auto">Add Department</Button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search departments..." />
        </div>
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load departments.</div>}
        <DataTable columns={columns} data={(data?.items || []).filter((r) => r.is_active)} loading={isLoading} />
        <TablePagination
          page={page} pages={data?.pages || 1} total={data?.total || 0}
          perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? "Edit Department" : "Add Department"}
      >
        <DepartmentForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createDept.isPending || updateDept.isPending}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Department"
        message="Are you sure you want to deactivate this department?"
        confirmText="Deactivate"
        loading={deactivateDept.isPending}
      />
    </div>
  );
}