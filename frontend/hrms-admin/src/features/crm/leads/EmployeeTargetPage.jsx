import { useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";

import {
  useEmployeeTargets,
  useCreateEmployeeTarget,
  useUpdateEmployeeTarget,
  useDeactivateEmployeeTarget,
  useReactivateEmployeeTarget,
} from "./useEmployeeTargets";

import { useCRMEmployeeOptions } from "@/hooks/useLookupOptions";

/* =========================================================
   HELPERS
========================================================= */

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function getMonthLabel(month) {
  return MONTH_OPTIONS.find((m) => m.value === Number(month))?.label || month;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

const now = new Date();

/* =========================================================
   PAGE
========================================================= */

export default function EmployeeTargetPage() {
  const { showToast } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useEmployeeTargets({ page: 1, per_page: 1000 });

  const allRecords = allData?.items || [];

  const createTarget = useCreateEmployeeTarget();
  const updateTarget = useUpdateEmployeeTarget();
  const deactivateTarget = useDeactivateEmployeeTarget();
  const reactivateTarget = useReactivateEmployeeTarget();

  const employeeOptions = useCRMEmployeeOptions();

  /* -------------------------------------------------------
     FILTERS / STATE
  ------------------------------------------------------- */

  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);

  const [formState, setFormState] = useState({
    employee_id: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    target_customer_count: "",
  });

  const filtered = useMemo(() => {
    return allRecords.filter((record) => {
      const isActive = record.is_active !== false;

      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;
      if (monthFilter && String(record.month) !== String(monthFilter)) return false;
      if (yearFilter && String(record.year) !== String(yearFilter)) return false;

      return true;
    });
  }, [allRecords, activeFilter, monthFilter, yearFilter]);

  const yearOptions = useMemo(() => {
    const years = new Set(allRecords.map((r) => r.year));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecords]);

  /* -------------------------------------------------------
     HANDLERS
  ------------------------------------------------------- */

  const openAddForm = () => {
    setEditingRecord(null);
    setFormState({
      employee_id: "",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      target_customer_count: "",
    });
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setEditingRecord(record);
    setFormState({
      employee_id: record.employee_id ?? record.employee?.id ?? "",
      month: record.month,
      year: record.year,
      target_customer_count: record.target_customer_count ?? "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      employee_id: Number(formState.employee_id),
      month: Number(formState.month),
      year: Number(formState.year),
      target_customer_count: Number(formState.target_customer_count) || 0,
    };

    try {
      if (editingRecord) {
        await updateTarget.mutateAsync({ id: editingRecord.id, payload });
        showToast("Target updated", "success");
      } else {
        await createTarget.mutateAsync(payload);
        showToast("Target set", "success");
      }
      setFormOpen(false);
      setEditingRecord(null);
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save target (a target for this employee + month may already exist, or the employee isn't in the CRM department)",
        "error"
      );
    }
  };

  const confirmDeactivate = async () => {
    if (!deleteTarget?.id) return;
    try {
      setMutatingId(deleteTarget.id);
      await deactivateTarget.mutateAsync(deleteTarget.id);
      showToast("Target deactivated", "success");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to deactivate target", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const handleReactivate = async (record) => {
    try {
      setMutatingId(record.id);
      await reactivateTarget.mutateAsync(record.id);
      showToast("Target reactivated", "success");
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to reactivate target", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const isSaving = createTarget.isPending || updateTarget.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load employee targets.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Employee Targets
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Monthly registered-customer quota per CRM employee — registrations above this limit count toward incentives
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} />
          <Button type="button" onClick={openAddForm} className="h-10 px-4">
            <span className="mr-1.5 text-lg">+</span>
            Set Target
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Months</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
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
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  No targets found.
                </td>
              </tr>
            ) : (
              filtered
                .slice()
                .sort((a, b) => b.year - a.year || b.month - a.month)
                .map((record) => {
                  const isActive = record.is_active !== false;
                  const employeeName = record.employee
                    ? `${record.employee.first_name || ""} ${record.employee.last_name || ""}`.trim()
                    : `Employee #${record.employee_id}`;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{employeeName}</p>
                        <p className="text-[10px] text-slate-400">{record.employee?.employee_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {getMonthLabel(record.month)} {record.year}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {record.target_customer_count}
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

      {/* ADD / EDIT FORM */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editingRecord ? "Edit Target" : "Set Employee Target"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  CRM Employee
                </label>
                <select
                  required
                  value={formState.employee_id}
                  onChange={(e) => setFormState((s) => ({ ...s, employee_id: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select employee</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.value} value={employee.value}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Month
                  </label>
                  <select
                    required
                    value={formState.month}
                    onChange={(e) => setFormState((s) => ({ ...s, month: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Year
                  </label>
                  <input
                    type="number"
                    required
                    value={formState.year}
                    onChange={(e) => setFormState((s) => ({ ...s, year: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Target Registered Customers
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formState.target_customer_count}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, target_customer_count: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Registrations above this number for the period are eligible for incentive calculation.
                </p>
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
                  {isSaving ? "Saving..." : editingRecord ? "Save Changes" : "Set Target"}
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
        title="Deactivate Target"
        message={
          deleteTarget
            ? `Deactivate the ${getMonthLabel(deleteTarget.month)} ${deleteTarget.year} target for this employee?`
            : ""
        }
        confirmText="Deactivate"
        loading={mutatingId !== null}
      />
    </div>
  );
}