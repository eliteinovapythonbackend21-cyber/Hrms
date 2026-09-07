import { useState } from "react";

import {
  useEmployeeExpenses,
  useCreateEmployeeExpense,
  useUpdateEmployeeExpense,
  useDeactivateEmployeeExpense,
} from "./useEmployeeExpenses";

import EmployeeExpenseForm from "./EmployeeExpenseForm";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";
import { getUser } from "@/utils/tokenHelpers";
import { isAdmin as checkIsAdmin } from "@/constants/roles";
import { useIsFinanceEmployee } from "@/hooks/useIsFinanceEmployee";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDate } from "@/utils/formatDate";

function formatAmount(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

const CATEGORY_BADGE_CLASS =
  "inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-400";

export default function EmployeeExpenseListPage() {
  const { showToast } = useToast();
  const user = getUser();
  const isAdmin = checkIsAdmin(user);
  const { isFinanceEmployee } = useIsFinanceEmployee();
  const canManageAll = isAdmin || isFinanceEmployee;

  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");

  const { data, isLoading, isFetching, refetch } = useEmployeeExpenses({
    per_page: 200,
    category: categoryFilter || undefined,
    is_active: activeFilter === "all" ? undefined : activeFilter === "active",
  });

  const createExpense = useCreateEmployeeExpense();
  const updateExpense = useUpdateEmployeeExpense();
  const deactivateExpense = useDeactivateEmployeeExpense();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);

  const expenses = data?.items || [];
  const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

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
        await updateExpense.mutateAsync({ id: editing.id, payload });
        showToast("Expense updated successfully", "success");
      } else {
        await createExpense.mutateAsync(payload);
        showToast("Expense recorded successfully", "success");
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to save expense",
        "error"
      );
    }
  };

  const handleDeactivate = async () => {
    if (!confirmRow) return;
    try {
      await deactivateExpense.mutateAsync(confirmRow.id);
      showToast("Expense deactivated", "success");
      setConfirmRow(null);
    } catch (error) {
      showToast(error?.response?.data?.message || "Operation failed", "error");
    }
  };

  const columns = [
    {
      key: "category",
      label: "Category",
      render: (r) => <Badge className={CATEGORY_BADGE_CLASS}>{r.category || "-"}</Badge>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (r) => (
        <span className="font-semibold text-slate-800 dark:text-white">
          {formatAmount(r.amount)}
        </span>
      ),
    },
    {
      key: "expense_date",
      label: "Date",
      render: (r) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {formatDate(r.expense_date)}
        </span>
      ),
    },
    ...(canManageAll
      ? [
          {
            key: "employee",
            label: "Employee",
            render: (r) => (
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {[r.employee?.first_name, r.employee?.last_name].filter(Boolean).join(" ") ||
                  r.employee?.employee_code ||
                  "-"}
              </span>
            ),
          },
          {
            key: "company",
            label: "Company",
            render: (r) => (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {r.employee_hierarchy?.company?.name || "-"}
              </span>
            ),
          },
          {
            key: "branch",
            label: "Branch",
            render: (r) => (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {r.employee_hierarchy?.branch?.name || "-"}
              </span>
            ),
          },
          {
            key: "department",
            label: "Department",
            render: (r) => (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {r.employee_hierarchy?.department?.department_name || "-"}
              </span>
            ),
          },
          {
            key: "designation",
            label: "Designation",
            render: (r) => (
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {r.employee_hierarchy?.designation?.designation_name || "-"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "description",
      label: "Description",
      render: (r) => (
        <span className="line-clamp-2 max-w-[240px] text-sm text-slate-600 dark:text-slate-300">
          {r.description || "-"}
        </span>
      ),
    },
    {
      key: "receipt",
      label: "Receipt",
      render: (r) =>
        r.receipt_url ? (
          <a
            href={resolveUploadUrl(r.receipt_url)}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            View
          </a>
        ) : (
          <span className="text-xs text-slate-400">-</span>
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
          <button
            type="button"
            onClick={() => openEdit(r)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-primary-400 dark:hover:bg-primary-500/10"
          >
            Edit
          </button>
          {r.is_active && (
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
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.04] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {canManageAll ? "Employee Expenses" : "My Expenses"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {canManageAll
              ? "Day-to-day expenses logged by every employee"
              : "Log and track your day-to-day expenses"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} />
          <Button type="button" onClick={openAdd} className="h-10 px-4">
            <span className="mr-1.5 text-lg leading-none">+</span>
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Entries</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{expenses.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatAmount(totalAmount)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">All Categories</option>
            {[
              "Travel",
              "Food",
              "Fuel / Transport",
              "Accommodation",
              "Office Supplies",
              "Client Entertainment",
              "Other",
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
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

      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <DataTable columns={columns} data={expenses} loading={isLoading} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        title={editing ? "Edit Expense" : "Add Expense"}
      >
        <EmployeeExpenseForm
          key={editing?.id ?? "new-expense"}
          initialData={editing || {}}
          onSubmit={handleSubmit}
          loading={createExpense.isPending || updateExpense.isPending}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          isEdit={!!editing}
          canPickEmployee={canManageAll}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmRow}
        onClose={() => setConfirmRow(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Expense"
        message="Are you sure you want to deactivate this expense entry?"
        confirmText="Deactivate"
        loading={deactivateExpense.isPending}
      />
    </div>
  );
}
