import { useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";

import {
  useIncentiveSlabs,
  useCreateIncentiveSlab,
  useUpdateIncentiveSlab,
  useDeactivateIncentiveSlab,
  useReactivateIncentiveSlab,
} from "./useIncentiveSlabs";

import { formatCurrency } from "@/utils/formatCurrency";

export default function IncentiveSlabPage() {
  const { showToast } = useToast();

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useIncentiveSlabs({ page: 1, per_page: 1000 });

  const allSlabs = allData?.items || [];

  const createSlab = useCreateIncentiveSlab();
  const updateSlab = useUpdateIncentiveSlab();
  const deactivateSlab = useDeactivateIncentiveSlab();
  const reactivateSlab = useReactivateIncentiveSlab();

  const [activeFilter, setActiveFilter] = useState("active");

  const [formOpen, setFormOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);

  const [formState, setFormState] = useState({
    min_customers: "",
    max_customers: "",
    incentive_amount: "",
  });

  const filtered = allSlabs.filter((slab) => {
    const isActive = slab.is_active !== false;
    if (activeFilter === "active" && !isActive) return false;
    if (activeFilter === "inactive" && isActive) return false;
    return true;
  });

  const openAddForm = () => {
    setEditingSlab(null);
    setFormState({ min_customers: "", max_customers: "", incentive_amount: "" });
    setFormOpen(true);
  };

  const openEditForm = (slab) => {
    setEditingSlab(slab);
    setFormState({
      min_customers: slab.min_customers ?? "",
      max_customers: slab.max_customers ?? "",
      incentive_amount: slab.incentive_amount ?? "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      min_customers: Number(formState.min_customers) || 0,
      max_customers:
        formState.max_customers === "" ? null : Number(formState.max_customers),
      incentive_amount: Number(formState.incentive_amount) || 0,
    };

    try {
      if (editingSlab) {
        await updateSlab.mutateAsync({ id: editingSlab.id, payload });
        showToast("Slab updated", "success");
      } else {
        await createSlab.mutateAsync(payload);
        showToast("Slab created", "success");
      }
      setFormOpen(false);
      setEditingSlab(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || error?.message || "Failed to save slab", "error");
    }
  };

  const confirmDeactivate = async () => {
    if (!deleteTarget?.id) return;
    try {
      setMutatingId(deleteTarget.id);
      await deactivateSlab.mutateAsync(deleteTarget.id);
      showToast("Slab deactivated", "success");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to deactivate slab", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const handleReactivate = async (slab) => {
    try {
      setMutatingId(slab.id);
      await reactivateSlab.mutateAsync(slab.id);
      showToast("Slab reactivated", "success");
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to reactivate slab", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const isSaving = createSlab.isPending || updateSlab.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load incentive slabs.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Incentive Slabs
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Configure incentive amounts based on the number of extra registered customers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} />
          <Button type="button" onClick={openAddForm} className="h-10 px-4">
            <span className="mr-1.5 text-lg">+</span>
            Add Slab
          </Button>
        </div>
      </div>

      {/* FILTER */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit">
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

      {/* TABLE */}
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Extra Customers (Min)</th>
              <th className="px-4 py-3 font-medium">Extra Customers (Max)</th>
              <th className="px-4 py-3 font-medium">Incentive Amount</th>
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
                  No incentive slabs configured.
                </td>
              </tr>
            ) : (
              filtered
                .slice()
                .sort((a, b) => a.min_customers - b.min_customers)
                .map((slab) => {
                  const isActive = slab.is_active !== false;
                  return (
                    <tr key={slab.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        {slab.min_customers}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {slab.max_customers === null || slab.max_customers === undefined
                          ? "No upper limit"
                          : slab.max_customers}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(slab.incentive_amount)}
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
                            onClick={() => openEditForm(slab)}
                            className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
                          >
                            Edit
                          </button>
                          {isActive ? (
                            <button
                              type="button"
                              disabled={mutatingId === slab.id}
                              onClick={() => setDeleteTarget(slab)}
                              className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-40 dark:text-red-400"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={mutatingId === slab.id}
                              onClick={() => handleReactivate(slab)}
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
              {editingSlab ? "Edit Incentive Slab" : "Add Incentive Slab"}
            </h2>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Min Extra Customers
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formState.min_customers}
                  onChange={(e) => setFormState((s) => ({ ...s, min_customers: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Max Extra Customers (leave blank for no upper limit)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formState.max_customers}
                  onChange={(e) => setFormState((s) => ({ ...s, max_customers: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Incentive Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formState.incentive_amount}
                  onChange={(e) => setFormState((s) => ({ ...s, incentive_amount: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingSlab(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingSlab ? "Save Changes" : "Add Slab"}
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
        title="Deactivate Incentive Slab"
        message={
          deleteTarget
            ? `Deactivate the slab for ${deleteTarget.min_customers}+ extra customers?`
            : ""
        }
        confirmText="Deactivate"
        loading={mutatingId !== null}
      />
    </div>
  );
}