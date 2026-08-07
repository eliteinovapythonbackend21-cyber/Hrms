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

const EXPORT_COLUMNS = [
  { header: "Code", accessor: (r) => r.department_code },
  { header: "Name", accessor: (r) => r.department_name },
  { header: "Description", accessor: (r) => r.description },
  { header: "Status", accessor: (r) => (r.status ? "Active" : "Inactive") },
];

export default function DepartmentListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useDepartments(queryParams);

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
  const [confirmDept, setConfirmDept] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
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
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDept) return;
    try {
      await deactivateDept.mutateAsync(confirmDept.id);
      showToast("Department deactivated", "success");
      setConfirmDept(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate", "error");
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
        <Badge className={r.status ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
          {r.status ? "Active" : "Inactive"}
        </Badge>
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
          <Button onClick={openCreate} className="w-full sm:w-auto">Add Department</Button>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search departments..." />
        </div>
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load departments.</div>}
        <DataTable columns={columns} data={data?.items || []} loading={isLoading} />
        <TablePagination
          page={page} pages={data?.pages || 1} total={data?.total || 0}
          perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Department" : "Add Department"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button form="department-form" type="submit" isLoading={createDept.isPending || updateDept.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <DepartmentForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createDept.isPending || updateDept.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDept}
        onClose={() => setConfirmDept(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Department"
        message={`Are you sure you want to deactivate "${confirmDept?.department_name}"?`}
        confirmText="Deactivate"
        loading={deactivateDept.isPending}
      />
    </div>
  );
}
