import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeactivateLeaveType,
} from "./useLeaveTypes";

import LeaveTypeForm from "./LeaveTypeForm";

import DataTable from "@/components/table/DataTable";
import ViewToggle, { useViewMode } from "@/components/table/ViewToggle";
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
import {
  use3DTilt,
  useMagnetic,
  Motion3DStyles,
  GridPattern,
} from "@/hooks/use3DMotion";


const EXPORT_COLUMNS = [
  { header: "ID", accessor: (r) => r.id },
  { header: "Name", accessor: (r) => r.name },
  { header: "Category", accessor: (r) => r.category || "Leave" },
  {
    header: "Status",
    accessor: (r) => (r.is_active ? "Active" : "Inactive"),
  },
];


/* Tilt+glare stat tile used in the summary row. */
function StatTile({ tone, label, value, hint, icon }) {
  const { ref, handlers } = use3DTilt({ max: 9, scale: 1.02 });
  const border = {
    primary: "border-slate-200 dark:border-white/10",
    emerald: "border-emerald-100 dark:border-emerald-900/30",
    red: "border-red-100 dark:border-red-900/30",
  }[tone];
  const valueColor = {
    primary: "text-slate-900 dark:text-white",
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
  }[tone];
  const iconTone = {
    primary: "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  }[tone];

  return (
    <div className="u-tilt-perspective">
      <div
        ref={ref}
        {...handlers}
        className={`u-tilt u-glare relative h-[110px] overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-white/[0.04] ${border}`}
      >
        <div className="u-tilt-content flex h-full items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>
          </div>
          <div className={`u-float-layer flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* 3D tilt+glare leave-type card. */
function LeaveTypeCard({ row, index, canEdit, canDelete, onEdit, onDelete }) {
  const { ref, handlers } = use3DTilt({ max: 10, scale: 1.025 });
  const category = row.category || "Leave";

  return (
    <div
      className="u-tilt-perspective u-rise"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <div
        ref={ref}
        {...handlers}
        className="u-tilt u-glare relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
      >
        <div className="u-tilt-content flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="u-float-layer relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              {row.name?.charAt(0)?.toUpperCase() || "L"}
              <span
                className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  row.is_active ? "bg-emerald-500 u-pulse" : "bg-red-500"
                }`}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {row.name || "-"}
              </p>
              <p className="font-mono text-[11px] text-slate-400">#{row.id}</p>
            </div>
          </div>
          <Badge
            className={
              row.is_active
                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }
          >
            {row.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="u-tilt-content mt-3 flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-transform duration-200 hover:scale-105 ${
              category === "Permission"
                ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
            }`}
          >
            {category}
          </span>

          <div className="flex items-center gap-1.5">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-50 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-primary-400 dark:hover:bg-primary-500/10"
              >
                Edit
              </button>
            )}
            {row.is_active && canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm dark:border-red-900/50 dark:bg-white/[0.06] dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaveTypeListPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
  } = usePagination();

  const {
    value,
    setValue,
    debouncedValue,
  } = useDebouncedSearch();


  const queryParams = {
    ...params,
    search: debouncedValue || undefined,
  };


  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useLeaveTypes(queryParams);


  const {
    canAdd,
    canEdit,
    canDelete,
  } = useModulePermissions("Leave Types");


  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll: masterApi.listLeaveTypes,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "leave-types",
    title: "Leave Types",
  });


  const createLT = useCreateLeaveType();
  const updateLT = useUpdateLeaveType();
  const deactivateLT = useDeactivateLeaveType();


  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useViewMode("leaveTypes:view");

  const addMagnet = useMagnetic(0.25);


  const leaveTypes = data?.items || [];


  const activeLeaveTypes = leaveTypes.filter(
    (item) => item.is_active
  );


  const inactiveLeaveTypes = leaveTypes.filter(
    (item) => !item.is_active
  );


  const filteredLeaveTypes = leaveTypes.filter(
    (item) => {
      if (categoryFilter !== "all" && (item.category || "Leave") !== categoryFilter) {
        return false;
      }

      if (statusFilter === "active") {
        return item.is_active;
      }

      if (statusFilter === "inactive") {
        return !item.is_active;
      }

      return true;
    }
  );


  // =====================================================
  // OPEN ADD
  // =====================================================

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };


  // =====================================================
  // OPEN EDIT
  // =====================================================

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };


  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await updateLT.mutateAsync({
          id: editing.id,
          payload,
        });

        showToast(
          "Leave Type updated successfully",
          "success"
        );
      } else {
        await createLT.mutateAsync(payload);

        showToast(
          "Leave Type created successfully",
          "success"
        );
      }

      setModalOpen(false);
      setEditing(null);

      queryClient.invalidateQueries({
        queryKey: ["leaveTypes"],
      });

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };


  // =====================================================
  // DEACTIVATE
  // =====================================================

  const handleDeactivate = async () => {
    if (!confirmRow) return;

    try {
      await deactivateLT.mutateAsync(confirmRow.id);

      showToast(
        "Leave Type deactivated successfully",
        "success"
      );

      setConfirmRow(null);

      queryClient.invalidateQueries({
        queryKey: ["leaveTypes"],
      });

      refetch();
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };


  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = [
    {
      key: "id",
      label: "ID",

      render: (r) => (
        <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
          #{r.id}
        </span>
      ),
    },


    {
      key: "name",
      label: "Leave Type",

      render: (r) => {
        const firstLetter =
          r.name?.charAt(0)?.toUpperCase() || "L";

        return (
          <div className="flex min-w-0 items-center gap-2">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">
                {firstLetter}
              </span>
            </div>

            <div className="min-w-0">

              <p className="truncate font-semibold text-slate-800 dark:text-white">
                {r.name || "-"}
              </p>

            </div>

          </div>
        );
      },
    },


    {
      key: "category",
      label: "Category",

      render: (r) => {
        const category = r.category || "Leave";
        return (
          <Badge
            className={
              category === "Permission"
                ? "inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                : "inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
            }
          >
            {category}
          </Badge>
        );
      },
    },


    {
      key: "status",
      label: "Status",

      render: (r) => (
        <div className="flex items-center gap-3">

          <Badge
            className={
              r.is_active
                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }
          >

            <span
              className={
                r.is_active
                  ? "h-1.5 w-1.5 rounded-full bg-emerald-500 u-pulse"
                  : "h-1.5 w-1.5 rounded-full bg-red-500"
              }
            />

            {r.is_active
              ? "Active"
              : "Inactive"}

          </Badge>

        </div>
      ),
    },


    {
      key: "actions",
      label: "Actions",

      render: (r) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">

          {canEdit && (
            <button
              type="button"
              onClick={() => openEdit(r)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-primary-400 dark:hover:bg-primary-500/10"
            >
              Edit
            </button>
          )}

          {r.is_active && canDelete && (
            <button
              type="button"
              onClick={() => setConfirmRow(r)}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-white/[0.06] dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Deactivate
            </button>
          )}

        </div>
      ),
    },
  ];


  return (
    <div className="space-y-5">
      <Motion3DStyles />

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="u-rise relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-primary-50/40 to-white p-4 shadow-sm dark:border-white/[0.08] dark:from-primary-500/[0.08] dark:via-white/[0.02] dark:to-transparent xl:flex-row xl:items-center xl:justify-between">
        <GridPattern id="leavetype-grid" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-500/15 blur-3xl" />

        <div className="relative">

          <div className="flex items-center gap-3">

            <div className="u-hover-float">
              <div className="u-float-target flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/30 ring-1 ring-white/20">
                <span className="font-bold">
                  L
                </span>
              </div>
            </div>

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Leave Types
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Manage leave types
              </p>

            </div>

          </div>

        </div>


        <div className="relative flex flex-wrap items-center gap-2">

          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          {canAdd && (
            <div ref={addMagnet.ref} {...addMagnet.handlers} className="inline-block w-full will-change-transform sm:w-auto">
              <Button
                onClick={openAdd}
                className="h-10 w-full px-4 shadow-sm transition-shadow duration-200 hover:shadow-lg sm:w-auto"
              >
                <span className="mr-1.5 text-lg leading-none transition-transform duration-300 hover:rotate-90">
                  +
                </span>

                Add Leave Type
              </Button>
            </div>
          )}

        </div>

      </div>


      {/* =====================================================
          STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          tone="primary"
          label="Total Leave Types"
          value={leaveTypes.length}
          hint="Current page"
          icon={<span className="text-sm font-bold">L</span>}
        />
        <StatTile
          tone="emerald"
          label="Active Leave Types"
          value={activeLeaveTypes.length}
          hint="Currently active"
          icon={<span className="h-2.5 w-2.5 rounded-full bg-emerald-500 u-pulse" />}
        />
        <StatTile
          tone="red"
          label="Inactive Leave Types"
          value={inactiveLeaveTypes.length}
          hint="Deactivated leave types"
          icon={<span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
        />
      </div>


      {/* =====================================================
          TABLE CARD
      ====================================================== */}

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">


        {/* SEARCH + FILTER */}

        <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div className="w-full lg:max-w-sm">

              <TableSearchBar
                value={value}
                onChange={setValue}
                placeholder="Search leave types..."
              />

            </div>


            <div className="flex flex-wrap items-center gap-2">

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">

              {["all", "Leave", "Permission"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    categoryFilter === cat
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {cat === "all" ? "All Types" : cat}
                </button>
              ))}

            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">

              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "active"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Active
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "inactive"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Inactive
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  statusFilter === "all"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                All
              </button>

            </div>

            <ViewToggle mode={view} onChange={setView} />

            </div>

          </div>

        </div>


        {/* ERROR */}

        {isError && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">

            <p className="font-medium">
              Failed to load leave types.
            </p>

            <p className="mt-1 text-xs opacity-80">
              Please refresh the page and try again.
            </p>

          </div>
        )}


        {/* TABLE / CARDS */}

        {!isError && view === "cards" && !isLoading && filteredLeaveTypes.length > 0 && (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLeaveTypes.map((r, i) => (
              <LeaveTypeCard
                key={r.id}
                row={r}
                index={i}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={() => openEdit(r)}
                onDelete={() => setConfirmRow(r)}
              />
            ))}
          </div>
        )}

        {!isError && (view === "table" || isLoading) && (
          <div className="w-full">

            <DataTable
              columns={columns}
              data={filteredLeaveTypes}
              loading={isLoading}
            />

          </div>
        )}


        {/* EMPTY STATE */}

        {!isLoading &&
          !isError &&
          filteredLeaveTypes.length === 0 && (

            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.06]">

                <span className="text-xl font-bold text-slate-400">
                  L
                </span>

              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
                No leave types found
              </h3>

              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                No leave types match your current search or status filter.
              </p>

              {canAdd && (
                <Button
                  onClick={openAdd}
                  className="mt-4 h-9 px-4 text-sm"
                >
                  + Add Leave Type
                </Button>
              )}

            </div>

          )}


        {/* PAGINATION */}

        <div className="border-t border-slate-200 px-2 dark:border-white/10">

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


      {/* =====================================================
          LEAVE TYPE MODAL
      ====================================================== */}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? "Edit Leave Type"
            : "Add Leave Type"
        }
      >

        <LeaveTypeForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={
            createLT.isPending ||
            updateLT.isPending
          }
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          isEdit={!!editing}
        />

      </Modal>


      {/* =====================================================
          DEACTIVATE CONFIRMATION
      ====================================================== */}

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Leave Type"
        message="Are you sure you want to deactivate this leave type?"
        confirmText="Deactivate"
        loading={deactivateLT.isPending}
      />

    </div>
  );
}