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

// Config-driven list page shared by master-data and transactional features.
//
// actionsMode:
//   "master" / "all" -> Edit + Deactivate (MasterListActions).
//                        "all" is accepted as an alias for "master" so
//                        pages written with actionsMode="all" (a common
//                        mistake - there is no dedicated "all" action
//                        set) still get the full Edit+Deactivate button
//                        set instead of silently falling through to
//                        Deactivate-only.
//   "transactional"   -> Deactivate only (TransactionalListActions).
//                        This is also the fallback for any other
//                        unrecognized value, so a typo doesn't hide
//                        actions entirely.
//   "none"            -> Read-only / caller-controlled actions.
//
// queryParams: optional object of extra filters the caller wants
// merged into every list request (period ranges, organization
// filters, is_active, etc). Spread in AFTER the internal
// page/per_page/search state so any key it defines takes
// precedence, while GenericListPage's own pagination/search state
// still supplies whatever externalQueryParams doesn't set. Defaults
// to {} so pages that don't pass this prop are completely
// unaffected. THIS WAS PREVIOUSLY MISSING ENTIRELY - callers could
// pass queryParams={...} and it was silently dropped, since React
// does not warn on unused props. That silent drop was the root
// cause of TrainingProgramListPage's period/organization/status
// filters never reaching the backend.
//
// The search/filter section uses a fixed 40px height so that the
// TableSearchBar stays visually aligned with Select/Input controls
// used by individual modules.
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
  queryParams: externalQueryParams = {},
}) {
  const { showToast } = useToast();

  const {
    canAdd,
    canView,
    loading: permsLoading,
  } = useModulePermissions(module);

  const addAllowed = module ? canAdd : true;

  const viewDenied = module
    ? !permsLoading && !canView
    : false;

  // Normalize actionsMode so "all" (a common but unrecognized value)
  // behaves identically to "master" instead of silently falling
  // through to the transactional (Deactivate-only) branch below.
  const normalizedActionsMode =
    actionsMode === "all" ? "master" : actionsMode;

  /* ============================================================
     PAGINATION
  ============================================================ */

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
  } = usePagination();

  /* ============================================================
     SEARCH
  ============================================================ */

  const {
    value,
    setValue,
    debouncedValue,
  } = useDebouncedSearch();

  /* ============================================================
     QUERY PARAMS
     Merges: internal pagination state -> internal search state ->
     caller-supplied external filters (period range, org filters,
     is_active, etc). externalQueryParams is spread last so any key
     it defines wins over this component's own defaults.
  ============================================================ */

  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
    ...externalQueryParams,
  };

  /* ============================================================
     DATA
  ============================================================ */

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useList(queryParams);

  /* ============================================================
     EXPORT
  ============================================================ */

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: api.list,
    queryParams,
    exportColumns: exportColumns || columns,
    filename,
    title,
  });

  /* ============================================================
     MUTATIONS
  ============================================================ */

  const createMutation = useCreate
    ? useCreate()
    : null;

  const updateMutation = useUpdate
    ? useUpdate()
    : null;

  const removeMutation = useRemove
    ? useRemove()
    : null;

  /* ============================================================
     MODAL STATE
  ============================================================ */

  const [modalOpen, setModalOpen] = useState(
    !!autoOpenCreateWith
  );

  const [editing, setEditing] = useState(null);

  const [confirmRow, setConfirmRow] = useState(null);

  const isSaving =
    createMutation?.isPending ||
    updateMutation?.isPending;

  /* ============================================================
     CREATE
  ============================================================ */

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  /* ============================================================
     EDIT
  ============================================================ */

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  /* ============================================================
     SUBMIT
  ============================================================ */

  const handleSubmit = async (payload) => {
    // Prevent duplicate submissions.
    if (isSaving) return;

    try {
      if (editing && updateMutation) {
        await updateMutation.mutateAsync({
          id: editing.id,
          payload,
        });

        showToast(
          `${entityLabel} updated`,
          "success"
        );
      } else if (createMutation) {
        await createMutation.mutateAsync(payload);

        showToast(
          `${entityLabel} created`,
          "success"
        );
      }

      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };

  /* ============================================================
     DEACTIVATE
  ============================================================ */

  const handleDeactivate = async () => {
    if (!confirmRow || !removeMutation) {
      return;
    }

    try {
      await removeMutation.mutateAsync(
        confirmRow.id
      );

      showToast(
        `${entityLabel} deactivated`,
        "success"
      );

      setConfirmRow(null);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Failed to deactivate",
        "error"
      );
    }
  };

  /* ============================================================
     ACTION COLUMN
  ============================================================ */

  const actionsColumn =
    normalizedActionsMode === "none"
      ? null
      : {
          key: "actions",
          label: "Actions",

          render: (row) =>
            normalizedActionsMode === "master" ? (
              <MasterListActions
                row={row}
                onEdit={openEdit}
                onDeactivate={setConfirmRow}
                module={module}
              />
            ) : (
              <TransactionalListActions
                row={row}
                onDeactivate={setConfirmRow}
                extra={
                  renderRowExtra
                    ? renderRowExtra(row)
                    : null
                }
                module={module}
              />
            ),
        };

  const allColumns = actionsColumn
    ? [...columns, actionsColumn]
    : columns;

  /* ============================================================
     PERMISSION DENIED
  ============================================================ */

  if (viewDenied) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          You don't have permission to view this module.
        </div>
      </div>
    );
  }

  /* ============================================================
     PAGE
  ============================================================ */

  return (
    <div className="w-full space-y-6">

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          {/* TITLE */}

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-2">

            <TableToolbar
              onRefresh={refetch}
              refreshing={isFetching}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              exporting={exporting}
            />

            {!hideAdd &&
              FormComponent &&
              addAllowed && (
                <Button
                  onClick={openCreate}
                  className="h-10 w-full sm:w-auto"
                >
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>

                    {addLabel}
                  </span>
                </Button>
              )}

          </div>
        </div>
      </div>

      {/* ========================================================
          TABLE CARD
      ======================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

        {/* ======================================================
            SEARCH / FILTER BAR
        ====================================================== */}

        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/70 sm:px-6">

          <div className="flex flex-col gap-3">

            {/* LABEL */}

            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {title} Records
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Search and manage {entityLabel.toLowerCase()}s
              </p>
            </div>

            {/* SEARCH */}

            <div className="flex h-10 w-full items-center">

              <TableSearchBar
                value={value}
                onChange={(newValue) => {
                  setValue(newValue);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-10 w-full"
              />

            </div>

          </div>
        </div>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {isError && (
          <div className="p-5">

            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    Unable to load records
                  </p>

                  <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
                    Failed to load{" "}
                    {title.toLowerCase()}.
                  </p>
                </div>

                <Button
                  variant="secondary"
                  onClick={refetch}
                >
                  Retry
                </Button>

              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="relative">

          {/* FETCHING INDICATOR */}

          {isFetching && !isLoading && (
            <div className="absolute right-5 top-4 z-10">

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">

                <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />

                Updating

              </div>
            </div>
          )}

          <DataTable
            columns={allColumns}
            data={data?.items || []}
            loading={isLoading}
          />

        </div>

        {/* ======================================================
            PAGINATION
        ====================================================== */}

        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50 sm:px-6">

          <TablePagination
            page={page}
            pages={data?.pages || 1}
            total={data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />

        </div>

      </div>

      {/* ========================================================
          CREATE / EDIT MODAL
      ======================================================== */}

      {FormComponent && (
        <Modal
          open={modalOpen}
          onClose={() => {
            if (!isSaving) {
              setModalOpen(false);
              setEditing(null);
            }
          }}
          title={
            editing
              ? `Edit ${formTitle}`
              : `Add ${formTitle}`
          }
          footer={
            <div className="flex items-center justify-end gap-2">

              <Button
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                form={`${filename}-form`}
                loading={isSaving}
                disabled={isSaving}
              >
                {isSaving
                  ? "Submitting..."
                  : editing
                  ? "Save"
                  : "Submit"}
              </Button>

            </div>
          }
        >

          <div className="w-full">

            <FormComponent
              formId={`${filename}-form`}
              initialData={
                editing ||
                autoOpenCreateWith ||
                {}
              }
              onSubmit={handleSubmit}
              loading={isSaving}
              onCancel={() =>
                setModalOpen(false)
              }
              isEdit={!!editing}
            />

          </div>

        </Modal>
      )}

      {/* ========================================================
          CONFIRM DEACTIVATE
      ======================================================== */}

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