import { useState } from "react";

import {
  useMembershipPlans,
  useCreateMembershipPlan,
  useUpdateMembershipPlan,
  useDeactivateMembershipPlan,
  useReactivateMembershipPlan,
} from "./useMembershipPlans";

import MembershipPlanForm from "./MembershipPlanForm";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";

import { useTableExport } from "@/hooks/useTableExport";
import { useToast } from "@/components/feedback/Toast";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { crmApi } from "@/api/crm.api";

const EXPORT_COLUMNS = [
  { header: "Plan Name", accessor: (r) => r.name },
  { header: "Rate", accessor: (r) => r.rate },
  { header: "Status", accessor: (r) => (r.is_active ? "Active" : "Inactive") },
];

export default function MembershipPlanListPage() {
  const { showToast } = useToast();
  const { data, isLoading, isError, isFetching, refetch } = useMembershipPlans({ per_page: 200 });

  const { canAdd, canEdit, canDelete } = useModulePermissions("Membership Plans");

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: crmApi.membershipPlans.list,
    exportColumns: EXPORT_COLUMNS,
    filename: "membership-plans",
    title: "Membership Plans",
  });

  const createPlan = useCreateMembershipPlan();
  const updatePlan = useUpdateMembershipPlan();
  const deactivatePlan = useDeactivateMembershipPlan();
  const reactivatePlan = useReactivateMembershipPlan();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const plans = data?.items || [];

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
        await updatePlan.mutateAsync({ id: editing.id, payload });
        showToast("Membership plan updated successfully", "success");
      } else {
        await createPlan.mutateAsync(payload);
        showToast("Membership plan created successfully", "success");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRow) return;
    try {
      await deactivatePlan.mutateAsync(confirmRow.id);
      showToast("Membership plan deactivated", "success");
      setConfirmRow(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Operation failed", "error");
    }
  };

  const handleReactivate = async (row) => {
    try {
      await reactivatePlan.mutateAsync(row.id);
      showToast("Membership plan reactivated", "success");
    } catch (error) {
      showToast(error?.response?.data?.message || "Operation failed", "error");
    }
  };

  const columns = [
    {
      key: "name",
      label: "Plan Name",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
            {r.name?.charAt(0)?.toUpperCase() || "M"}
          </div>
          <p className="font-semibold text-slate-800 dark:text-white">{r.name || "-"}</p>
        </div>
      ),
    },
    {
      key: "rate",
      label: "Rate",
      render: (r) => (
        <span className="font-medium text-slate-700 dark:text-slate-200">
          ₹{Number(r.rate || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <Badge
          className={
            r.is_active
              ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }
        >
          <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
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
          {!r.is_active && canEdit && (
            <button
              type="button"
              onClick={() => handleReactivate(r)}
              className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-white/[0.06] dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              Reactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Membership Plans
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage the CRM membership plans and their prices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
          >
            {isFetching ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
          >
            Excel
          </button>
          <button
            type="button"
            onClick={exportPDF}
            disabled={exporting}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
          >
            PDF
          </button>
          {canAdd && (
            <Button onClick={openAdd} className="h-10 px-4">
              <span className="mr-1.5 text-lg leading-none">+</span>
              Add Plan
            </Button>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        {isError ? (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
            Failed to load membership plans.
          </div>
        ) : (
          <DataTable columns={columns} data={plans} loading={isLoading} />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Membership Plan" : "Add Membership Plan"}
      >
        <MembershipPlanForm
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createPlan.isPending || updatePlan.isPending}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          isEdit={!!editing}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Membership Plan"
        message="Are you sure you want to deactivate this membership plan?"
        confirmText="Deactivate"
        loading={deactivatePlan.isPending}
      />
    </div>
  );
}
