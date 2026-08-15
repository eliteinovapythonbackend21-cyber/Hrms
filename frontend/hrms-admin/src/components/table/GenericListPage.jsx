import { useState } from "react";
import DataTable from "@/components/table/DataTable";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableSearchBar from "@/components/table/TableSearchBar";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import MasterListActions from "@/components/MasterListActions";
import TransactionalListActions from "@/components/TransactionalListActions";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import { useModulePermissions } from "@/hooks/useModulePermissions";

// Config-driven list page shared by every master-data and transactional
// feature. actionsMode: "master" (Edit+Delete), "transactional" (Delete
// only), or "none" (list is read-only / actions rendered by caller).
export default function GenericListPage({
  title,
  subtitle,
  columns,
  api,
  useList,
  useCreate,
  useUpdate,
  useRemove,
  exportColumns,
  filename,
  searchPlaceholder = "Search...",
  FormComponent,
  formTitle,
  addLabel = "Add",
  actionsMode = "transactional",
  hideAdd = false,
  renderRowExtra,
  entityLabel = "record",
  autoOpenCreateWith = null,
  module = null,
}) {
  const { showToast } = useToast();
  const { canAdd, canView, loading: permsLoading } = useModulePermissions(module);
  const addAllowed = module ? canAdd : true;
  // Unlike Add/Edit/Delete (row-level buttons), a missing "view" grant means
  // the whole module is off-limits — including for the admin role, since
  // Admin > Roles & Permissions can now revoke it just like any other role.
  const viewDenied = module ? !permsLoading && !canView : false;
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const { value, setValue, debouncedValue } = useDebouncedSearch();

  const queryParams = { ...params, search: debouncedValue || undefined };
  const { data, isLoading, isError, isFetching, refetch } = useList(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: api.list,
    queryParams,
    exportColumns: exportColumns || columns,
    filename,
    title,
  });

  const createMutation = useCreate ? useCreate() : null;
  const updateMutation = useUpdate ? useUpdate() : null;
  const removeMutation = useRemove ? useRemove() : null;

  const [modalOpen, setModalOpen] = useState(!!autoOpenCreateWith);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const isSaving = createMutation?.isPending || updateMutation?.isPending;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSubmit = async (payload) => {
    // Guard against duplicate submits (double-click, or a submit button
    // that fires again before the mutation's isPending flag re-renders).
    if (isSaving) return;
    try {
      if (editing && updateMutation) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
        showToast(`${entityLabel} updated`, "success");
      } else {
        await createMutation.mutateAsync(payload);
        showToast(`${entityLabel} created`, "success");
      }
      setModalOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRow) return;
    try {
      await removeMutation.mutateAsync(confirmRow.id);
      showToast(`${entityLabel} deactivated`, "success");
      setConfirmRow(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to deactivate", "error");
    }
  };

  const actionsColumn =
    actionsMode === "none"
      ? null
      : {
          key: "actions",
          label: "Actions",
          render: (row) =>
            actionsMode === "master" ? (
              <MasterListActions row={row} onEdit={openEdit} onDeactivate={setConfirmRow} module={module} />
            ) : (
              <TransactionalListActions
                row={row}
                onDeactivate={setConfirmRow}
                extra={renderRowExtra ? renderRowExtra(row) : null}
                module={module}
              />
            ),
        };

  const allColumns = actionsColumn ? [...columns, actionsColumn] : columns;

  if (viewDenied) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
          You don't have permission to view this module.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          {!hideAdd && FormComponent && addAllowed && (
            <Button onClick={openCreate} className="w-full sm:w-auto">
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <TableSearchBar value={value} onChange={setValue} placeholder={searchPlaceholder} />
        </div>
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load {title.toLowerCase()}.</div>}
        <DataTable columns={allColumns} data={data?.items || []} loading={isLoading} />
        <TablePagination page={page} pages={data?.pages || 1} total={data?.total || 0} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
      </div>

      {FormComponent && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? `Edit ${formTitle}` : `Add ${formTitle}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" form={`${filename}-form`} loading={isSaving} disabled={isSaving}>
                {isSaving ? "Submitting..." : editing ? "Save" : "Submit"}
              </Button>
            </>
          }
        >
          <FormComponent
            formId={`${filename}-form`}
            initialData={editing || autoOpenCreateWith || {}}
            onSubmit={handleSubmit}
            loading={isSaving}
            onCancel={() => setModalOpen(false)}
            isEdit={!!editing}
          />
        </Modal>
      )}

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title={`Deactivate ${entityLabel}`}
        message={`Are you sure you want to deactivate this ${entityLabel.toLowerCase()}?`}
        confirmText="Deactivate"
        loading={removeMutation?.isPending}
      />
    </div>
  );
}