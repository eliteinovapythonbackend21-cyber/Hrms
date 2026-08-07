import { useState } from "react";
import { useLeaveTypes, useCreateLeaveType } from "./useLeaveTypes";
import LeaveTypeForm from "./LeaveTypeForm";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
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
  { header: "ID", accessor: (r) => r.id },
  { header: "Name", accessor: (r) => r.name },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

// Add-only: Edit/Deactivate removed entirely, not permission-gated.
export default function LeaveTypeListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useLeaveTypes(queryParams);
  const { canAdd } = useModulePermissions("Leave Types");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: masterApi.listLeaveTypes,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "leave-types",
    title: "Leave Types",
  });

  const createLT = useCreateLeaveType();

  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = async (payload) => {
    try {
      await createLT.mutateAsync(payload);
      showToast("Leave type created", "success");
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (
        <Badge className={r.is_active ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Types</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage leave types</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          {canAdd && (
            <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">Add Leave Type</Button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder="Search leave types..." />
        </div>
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load leave types.</div>}
        <DataTable columns={columns} data={data?.items || []} loading={isLoading} />
        <TablePagination
          page={page} pages={data?.pages || 1} total={data?.total || 0}
          perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Leave Type"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="leavetype-form" isLoading={createLT.isPending}>
              Create
            </Button>
          </>
        }
      >
        <LeaveTypeForm
          initialData={{}}
          onSubmit={handleSubmit}
          loading={createLT.isPending}
        />
      </Modal>
    </div>
  );
}
