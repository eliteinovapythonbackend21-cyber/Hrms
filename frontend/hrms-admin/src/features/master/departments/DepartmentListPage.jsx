import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeactivateDepartment,
} from "./useDepartments";

import DepartmentForm from "./DepartmentForm";
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
  { header: "Company", accessor: (r) => r.company?.name },
  { header: "Branch", accessor: (r) => r.branch?.name },
  { header: "Description", accessor: (r) => r.description },
  {
    header: "Status",
    accessor: (r) => (r.is_active ? "Active" : "Inactive"),
  },
];


export default function DepartmentListPage() {
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
  } = useDepartments(queryParams);


  const {
    canAdd,
    canEdit,
    canDelete,
  } = useModulePermissions("Departments");


  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
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

  const [blockedInfo, setBlockedInfo] = useState(null);

  const [statusFilter, setStatusFilter] = useState("active");


  const departments = data?.items || [];


  const activeDepartments = departments.filter(
    (department) => department.is_active
  );


  const inactiveDepartments = departments.filter(
    (department) => !department.is_active
  );


  const filteredDepartments = departments.filter(
    (department) => {
      if (statusFilter === "active") {
        return department.is_active;
      }

      if (statusFilter === "inactive") {
        return !department.is_active;
      }

      return true;
    }
  );


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
        await updateDept.mutateAsync({
          id: editing.id,
          payload,
        });

        showToast(
          "Department updated successfully",
          "success"
        );
      } else {
        await createDept.mutateAsync(payload);

        showToast(
          "Department created successfully",
          "success"
        );
      }

      setModalOpen(false);
      setEditing(null);

      queryClient.invalidateQueries({
        queryKey: ["departments"],
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


  const handleDeactivate = async () => {
    try {
      await deactivateDept.mutateAsync(
        confirmRow.id
      );

      showToast(
        "Department deactivated successfully",
        "success"
      );

      setConfirmRow(null);

      queryClient.invalidateQueries({
        queryKey: ["departments"],
      });

      refetch();
    } catch (err) {
      if (err.response?.status === 409) {
        setConfirmRow(null);
        setBlockedInfo({
          name: confirmRow?.department_name,
          message: err.response?.data?.message,
        });
        return;
      }

      showToast(
        err.response?.data?.message ||
          "Operation failed",
        "error"
      );
    }
  };


  const handleReactivate = async (department) => {
    try {
      await updateDept.mutateAsync({
        id: department.id,
        payload: { is_active: true },
      });

      showToast(
        "Department reactivated successfully",
        "success"
      );

      queryClient.invalidateQueries({
        queryKey: ["departments"],
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


  const statusBadge = (isActive) => (
    <Badge
      className={
        isActive
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
      }
    >
      <span
        className={
          isActive
            ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
            : "h-1.5 w-1.5 rounded-full bg-red-500"
        }
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );


  return (
    <div className="space-y-5">


      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <span className="font-bold">
                D
              </span>
            </div>

            <div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Departments
              </h1>

              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Manage departments across companies and branches
              </p>

            </div>

          </div>

        </div>


        <div className="flex flex-wrap items-center gap-2">

          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

          {canAdd && (
            <Button
              onClick={openAdd}
              className="h-10 w-full px-4 sm:w-auto"
            >
              <span className="mr-1.5 text-lg">
                +
              </span>

              Add Department
            </Button>
          )}

        </div>

      </div>


      {/* =====================================================
          COMPACT STAT CARDS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <div className="h-[110px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Departments
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {departments.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Current page
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <span className="text-sm font-bold">D</span>
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-emerald-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Active Departments
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {activeDepartments.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Currently active
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="h-[110px] rounded-xl border border-red-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md dark:border-red-900/30 dark:bg-slate-900">
          <div className="flex h-full items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                Inactive Departments
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                {inactiveDepartments.length}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                Deactivated departments
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          </div>
        </div>

      </div>


      {/* =====================================================
          SEARCH + STATUS FILTER
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <div className="w-full lg:max-w-sm">
            <TableSearchBar
              value={value}
              onChange={setValue}
              placeholder="Search departments..."
            />
          </div>

          <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">

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

        </div>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
          <p className="font-medium">Failed to load departments.</p>
          <p className="mt-1 text-xs opacity-80">
            Please refresh the page and try again.
          </p>
        </div>
      )}


      {/* =====================================================
          CARD GRID
      ====================================================== */}

      {!isError && isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[190px] animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
            />
          ))}
        </div>
      )}

      {!isError && !isLoading && filteredDepartments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.map((dept) => {
            const firstLetter =
              dept.department_name?.charAt(0)?.toUpperCase() || "D";

            return (
              <div
                key={dept.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                      <span className="text-sm font-bold">
                        {firstLetter}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800 dark:text-white">
                        {dept.department_name}
                      </p>
                      <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">
                        {dept.department_code}
                      </p>
                    </div>
                  </div>

                  {statusBadge(dept.is_active)}
                </div>

                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Company</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {dept.company?.name || (
                        <span className="text-amber-500">Not assigned</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Branch</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {dept.branch?.name || (
                        <span className="text-amber-500">Not assigned</span>
                      )}
                    </span>
                  </div>
                  {dept.description && (
                    <p className="mt-2 line-clamp-2 text-slate-500 dark:text-slate-400">
                      {dept.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEdit(dept)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-400 dark:hover:bg-primary-500/10"
                    >
                      Edit
                    </button>
                  )}

                  {dept.is_active ? (
                    canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmRow(dept)}
                        className="flex-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        Deactivate
                      </button>
                    )
                  ) : (
                    canEdit && (
                      <button
                        type="button"
                        onClick={() => handleReactivate(dept)}
                        disabled={updateDept.isPending}
                        className="flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/50 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                      >
                        Reactivate
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {!isLoading && !isError && filteredDepartments.length === 0 && (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <span className="text-xl font-bold text-slate-400">D</span>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
            No departments found
          </h3>

          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No departments match your current search or status filter.
          </p>

          {canAdd && (
            <Button
              onClick={openAdd}
              className="mt-4 h-9 px-4 text-sm"
            >
              + Add Department
            </Button>
          )}
        </div>
      )}


      {/* =====================================================
          PAGINATION
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
        <TablePagination
          page={page}
          pages={data?.pages || 1}
          total={data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>


      {/* =====================================================
          DEPARTMENT MODAL
      ====================================================== */}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={
          editing
            ? "Edit Department"
            : "Add Department"
        }
      >

        <DepartmentForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={
            createDept.isPending ||
            updateDept.isPending
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
        title="Deactivate Department"
        message={
          confirmRow
            ? `Are you sure you want to deactivate "${confirmRow.department_name}"?`
            : "Are you sure you want to deactivate this department?"
        }
        confirmText="Deactivate"
        loading={deactivateDept.isPending}
      />


      {/* =====================================================
          BLOCKED — has active designations / employees
      ====================================================== */}

      <ConfirmDialog
        open={!!blockedInfo}
        onClose={() => setBlockedInfo(null)}
        onConfirm={() => setBlockedInfo(null)}
        title="Can't Deactivate Department"
        message={
          blockedInfo?.message ||
          (blockedInfo?.name
            ? `"${blockedInfo.name}" still has active designations or employees linked to it. Deactivate/reassign those first.`
            : "This department still has active designations or employees linked to it. Deactivate/reassign those first.")
        }
        confirmText="OK, Got It"
        confirmVariant="secondary"
      />

    </div>
  );
}