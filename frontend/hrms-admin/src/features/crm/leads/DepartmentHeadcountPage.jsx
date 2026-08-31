import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";

import {
  useDepartmentHeadcounts,
  useCreateDepartmentHeadcount,
  useUpdateDepartmentHeadcount,
  useDeactivateDepartmentHeadcount,
  useReactivateDepartmentHeadcount,
} from "./useDepartmentHeadcount";

import { useCRMEmployeeOptions } from "@/hooks/useLookupOptions";
import { masterApi } from "@/api/master.api";

/* =========================================================
   CONSTANTS
========================================================= */

const CRM_DEPARTMENT_NAME = "CRM";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

// Monday of the current week, ISO date string - sensible default for
// "record this week's headcount".
function getCurrentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday back to previous Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

/* =========================================================
   PAGE
========================================================= */

export default function DepartmentHeadcountPage() {
  const { showToast } = useToast();

  /* -------------------------------------------------------
     CRM department scope (mirrors CrmEmployeeView)
  ------------------------------------------------------- */

  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ["department-headcounts", "all-departments"],
    queryFn: async () =>
      (
        await masterApi.listDepartments({
          page: 1,
          per_page: 500,
          is_active: true,
        })
      ).data.data,
  });

  const crmDepartments = useMemo(() => {
    return (departmentsData?.items || []).filter(
      (department) =>
        (department.department_name || "").trim().toLowerCase() ===
        CRM_DEPARTMENT_NAME.toLowerCase()
    );
  }, [departmentsData]);

  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useDepartmentHeadcounts({ page: 1, per_page: 1000 });

  const allRecords = allData?.items || [];

  const createHeadcount = useCreateDepartmentHeadcount();
  const updateHeadcount = useUpdateDepartmentHeadcount();
  const deactivateHeadcount = useDeactivateDepartmentHeadcount();
  const reactivateHeadcount = useReactivateDepartmentHeadcount();

  const employeeOptions = useCRMEmployeeOptions();

  /* -------------------------------------------------------
     FILTERS / STATE
  ------------------------------------------------------- */

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);

  const [formState, setFormState] = useState({
    department_id: "",
    week_start_date: getCurrentWeekStart(),
    employee_count: "",
    updated_by: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    return allRecords.filter((record) => {
      const isActive = record.is_active !== false;

      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;

      if (
        departmentFilter &&
        String(record.department_id ?? record.department?.id) !== String(departmentFilter)
      ) {
        return false;
      }

      return true;
    });
  }, [allRecords, activeFilter, departmentFilter]);

  const latestPerDepartment = useMemo(() => {
    const map = new Map();
    for (const record of allRecords) {
      if (record.is_active === false) continue;
      const key = record.department_id ?? record.department?.id;
      const existing = map.get(key);
      if (!existing || new Date(record.week_start_date) > new Date(existing.week_start_date)) {
        map.set(key, record);
      }
    }
    return map;
  }, [allRecords]);

  const totalCurrentHeadcount = useMemo(
    () => Array.from(latestPerDepartment.values()).reduce((sum, r) => sum + (r.employee_count || 0), 0),
    [latestPerDepartment]
  );

  /* -------------------------------------------------------
     HANDLERS
  ------------------------------------------------------- */

  const openAddForm = () => {
    setEditingRecord(null);
    setFormState({
      department_id: crmDepartments[0]?.id ?? "",
      week_start_date: getCurrentWeekStart(),
      employee_count: "",
      updated_by: "",
      notes: "",
    });
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setEditingRecord(record);
    setFormState({
      department_id: record.department_id ?? record.department?.id ?? "",
      week_start_date: record.week_start_date ?? getCurrentWeekStart(),
      employee_count: record.employee_count ?? "",
      updated_by: record.updated_by ?? "",
      notes: record.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      department_id: Number(formState.department_id),
      week_start_date: formState.week_start_date,
      employee_count: Number(formState.employee_count) || 0,
      updated_by: formState.updated_by ? Number(formState.updated_by) : null,
      notes: formState.notes || null,
    };

    try {
      if (editingRecord) {
        await updateHeadcount.mutateAsync({ id: editingRecord.id, payload });
        showToast("Headcount updated", "success");
      } else {
        await createHeadcount.mutateAsync(payload);
        showToast("Headcount recorded", "success");
      }
      setFormOpen(false);
      setEditingRecord(null);
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save headcount (a record for this department + week may already exist)",
        "error"
      );
    }
  };

  const confirmDeactivate = async () => {
    if (!deleteTarget?.id) return;
    try {
      setMutatingId(deleteTarget.id);
      await deactivateHeadcount.mutateAsync(deleteTarget.id);
      showToast("Headcount record deactivated", "success");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to deactivate record", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const handleReactivate = async (record) => {
    try {
      setMutatingId(record.id);
      await reactivateHeadcount.mutateAsync(record.id);
      showToast("Headcount record reactivated", "success");
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to reactivate record", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const isSaving = createHeadcount.isPending || updateHeadcount.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load department headcount records.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Department Headcount
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Weekly employee count tracked per CRM department
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} />
          <Button type="button" onClick={openAddForm} className="h-10 px-4">
            <span className="mr-1.5 text-lg">+</span>
            Record Headcount
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Departments Tracked</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {latestPerDepartment.size}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/30 dark:bg-white/[0.04]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Current Total Headcount</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalCurrentHeadcount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Records</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {allRecords.length}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[220px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">All CRM Departments</option>
            {crmDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.department_name}
                {department.branch?.name ? ` — ${department.branch.name}` : ""}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
            {["active", "inactive", "all"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                  activeFilter === status
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <table className="w-full text-left text-sm">
          <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
            <tr>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Week Starting</th>
              <th className="px-4 py-3 font-medium">Employee Count</th>
              <th className="px-4 py-3 font-medium">Updated By</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading || departmentsLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No headcount records found.
                </td>
              </tr>
            ) : (
              filtered
                .slice()
                .sort((a, b) => new Date(b.week_start_date) - new Date(a.week_start_date))
                .map((record) => {
                  const isActive = record.is_active !== false;
                  return (
                    <tr key={record.id} className="tbl-row">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        {record.department?.department_name || `Department #${record.department_id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {formatDate(record.week_start_date)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {record.employee_count}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {record.updated_by_employee
                          ? `${record.updated_by_employee.first_name || ""} ${
                              record.updated_by_employee.last_name || ""
                            }`.trim()
                          : "-"}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="line-clamp-2">{record.notes || "-"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                          }
                        >
                          {isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(record)}
                            className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
                          >
                            Edit
                          </button>
                          {isActive ? (
                            <button
                              type="button"
                              disabled={mutatingId === record.id}
                              onClick={() => setDeleteTarget(record)}
                              className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-40 dark:text-red-400"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={mutatingId === record.id}
                              onClick={() => handleReactivate(record)}
                              className="text-xs font-semibold text-emerald-600 hover:underline disabled:opacity-40 dark:text-emerald-400"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT FORM (inline modal-less panel, matches no shared Modal import assumption) */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-white/[0.04]">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editingRecord ? "Edit Headcount Record" : "Record Weekly Headcount"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Department
                </label>
                <select
                  required
                  value={formState.department_id}
                  onChange={(e) => setFormState((s) => ({ ...s, department_id: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">Select department</option>
                  {crmDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.department_name}
                      {department.branch?.name ? ` — ${department.branch.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Week Starting
                </label>
                <input
                  type="date"
                  required
                  value={formState.week_start_date}
                  onChange={(e) => setFormState((s) => ({ ...s, week_start_date: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Employee Count
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formState.employee_count}
                  onChange={(e) => setFormState((s) => ({ ...s, employee_count: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Recorded By
                </label>
                <select
                  value={formState.updated_by}
                  onChange={(e) => setFormState((s) => ({ ...s, updated_by: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">Not specified</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.value} value={employee.value}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState((s) => ({ ...s, notes: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingRecord(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingRecord ? "Save Changes" : "Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate Headcount Record"
        message={
          deleteTarget
            ? `Deactivate the ${formatDate(deleteTarget.week_start_date)} headcount record for ${
                deleteTarget.department?.department_name || "this department"
              }?`
            : ""
        }
        confirmText="Deactivate"
        loading={mutatingId !== null}
      />
    </div>
  );
}