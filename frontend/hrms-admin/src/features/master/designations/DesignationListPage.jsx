import { useState } from "react";
import { useDesignations, useCreateDesignation } from "./useDesignations";
import DesignationForm from "./DesignationForm";
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
  { header: "Code", accessor: (r) => r.designation_code },
  { header: "Name", accessor: (r) => r.designation_name },
  { header: "Department", accessor: (r) => r.department?.department_name },
  { header: "Description", accessor: (r) => r.description },
  { header: "Status", accessor: (r) => (r.status ? "Active" : "Inactive") },
];

// Add-only: Edit/Deactivate removed entirely, not permission-gated.
export default function DesignationListPage() {
  const { showToast } = useToast();
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useDesignations(queryParams);
  const { canAdd } = useModulePermissions("Designations");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: masterApi.listDesignations,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "designations",
    title: "Designations",
  });

  const createDesig = useCreateDesignation();

  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = async (payload) => {
    try {
      await createDesig.mutateAsync(payload);
      showToast("Designation created", "success");
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
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
          {canAdd && (
            <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">Add Designation</Button>
          )}
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
        title="Add Designation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="designation-form" isLoading={createDesig.isPending}>
              Create
            </Button>
          </>
        }
      >
        <DesignationForm
          initialData={{}}
          onSubmit={handleSubmit}
          loading={createDesig.isPending}
        />
      </Modal>
    </div>
  );
}
