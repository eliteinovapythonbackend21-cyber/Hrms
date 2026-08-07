import { useState } from "react";
import { useDesignations, useCreateDesignation, useUpdateDesignation, useDeactivateDesignation } from "./useDesignations";
import DesignationForm from "./DesignationForm";
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
  { header: "Code", accessor: (r) => r.designation_code },
  { header: "Name", accessor: (r) => r.designation_name },
  { header: "Department", accessor: (r) => r.department?.department_name },
  { header: "Description", accessor: (r) => r.description },
  { header: "Status", accessor: (r) => (r.status ? "Active" : "Inactive") },
];

export default function DesignationListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useDesignations(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: masterApi.listDesignations,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "designations",
    title: "Designations",
  });

  const createDesig = useCreateDesignation();
  const updateDesig = useUpdateDesignation();
  const deactivateDesig = useDeactivateDesignation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDesig, setConfirmDesig] = useState(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateDesig.mutateAsync({ id: editing.id, payload });
        showToast("Designation updated", "success");
      } else {
        await createDesig.mutateAsync(payload);
        showToast("Designation created", "success");
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDesig) return;
    try {
      await deactivateDesig.mutateAsync(confirmDesig.id);
      showToast("Designation deactivated", "success");
      setConfirmDesig(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate", "error");
    }
  };

  const columns = [
    { key: "designation_code", label: "Code" },
    { key: "designation_name", label: "Name" },
    { key: "department", label: "Department", render: (r) => r.department?.department_name || "-" },
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Designations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage designations</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          <Button onClick={openCreate} className="w-full sm:w-auto">Add Designation</Button>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search designations..." />
        </div>
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load designations.</div>}
        <DataTable columns={columns} data={data?.items || []} loading={isLoading} />
        <TablePagination
          page={page} pages={data?.pages || 1} total={data?.total || 0}
          perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Designation" : "Add Designation"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="designation-form" isLoading={createDesig.isPending || updateDesig.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <DesignationForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createDesig.isPending || updateDesig.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmDesig}
        onClose={() => setConfirmDesig(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Designation"
        message={`Are you sure you want to deactivate "${confirmDesig?.designation_name}"?`}
        confirmText="Deactivate"
        loading={deactivateDesig.isPending}
      />
    </div>
  );
}
