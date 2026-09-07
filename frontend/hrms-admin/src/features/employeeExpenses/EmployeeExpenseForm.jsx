import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/Button";
import { useEmployeeExpenseCategories } from "./useEmployeeExpenses";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { employeesApi } from "@/api/employees.api";

function FieldLabel({ children, required = false }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

const FALLBACK_CATEGORIES = [
  "Travel",
  "Food",
  "Fuel / Transport",
  "Accommodation",
  "Office Supplies",
  "Client Entertainment",
  "Other",
];

export default function EmployeeExpenseForm({
  initialData = {},
  onSubmit,
  onCancel,
  loading,
  isEdit,
  // Only privileged (admin/Finance) logins get an Employee picker — a
  // plain employee always logs their own, stamped server-side regardless
  // of what's sent.
  canPickEmployee = false,
}) {
  const { data: categoryData } = useEmployeeExpenseCategories();
  const categories = categoryData?.categories || FALLBACK_CATEGORIES;
  const employeeOptions = useEmployeeOptions();

  // Full employee records (with department -> company/branch and
  // designation already nested, per Employee.to_dict()) so the selected
  // employee's org details can be shown read-only below — fetched only
  // for a privileged (admin/Finance) login, since a plain employee's own
  // details come from useMyEmployee() instead.
  const { data: employeesData } = useQuery({
    queryKey: ["lookup", "employees-detailed"],
    queryFn: async () => (await employeesApi.list({ is_active: true, per_page: 500 })).data.data,
    enabled: canPickEmployee,
  });
  const employees = employeesData?.items || [];

  const { employee: myEmployee } = useMyEmployee();

  const [employeeId, setEmployeeId] = useState(
    initialData.employee_id ?? initialData.employee?.id ?? ""
  );

  const selectedEmployee = canPickEmployee
    ? employees.find((e) => String(e.id) === String(employeeId))
    : myEmployee;

  const orgDetails = selectedEmployee
    ? {
        company: selectedEmployee.department?.company?.name || "",
        branch: selectedEmployee.department?.branch?.name || "",
        department: selectedEmployee.department?.department_name || "",
        designation: selectedEmployee.designation?.designation_name || "",
      }
    : null;
  const [category, setCategory] = useState(initialData.category || "");
  const [amount, setAmount] = useState(
    initialData.amount !== undefined && initialData.amount !== null
      ? String(initialData.amount)
      : ""
  );
  const [expenseDate, setExpenseDate] = useState(
    initialData.expense_date ? initialData.expense_date.slice(0, 10) : ""
  );
  const [description, setDescription] = useState(initialData.description || "");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (canPickEmployee && !employeeId) {
      setError("Please select an employee");
      return;
    }

    if (!category) {
      setError("Please select a category");
      return;
    }

    const amountValue = Number(amount);
    if (!amount || Number.isNaN(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!expenseDate) {
      setError("Please select the expense date");
      return;
    }

    setError("");

    const payload = {
      category,
      amount: amountValue,
      expense_date: expenseDate,
      description: description.trim() || undefined,
    };

    if (canPickEmployee && employeeId) {
      payload.employee_id = employeeId;
    }

    if (receipt) {
      payload.receipt = receipt;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {canPickEmployee && (
        <div>
          <FieldLabel required>Employee</FieldLabel>
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">Select an employee</option>
            {employeeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {orgDetails && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Employee Details
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Company", orgDetails.company],
              ["Branch", orgDetails.branch],
              ["Department", orgDetails.department],
              ["Designation", orgDetails.designation],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel required>Category</FieldLabel>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            <option value="">Select a category</option>
            {categories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel required>Amount (₹)</FieldLabel>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 450"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          />
        </div>
      </div>

      <div>
        <FieldLabel required>Expense Date</FieldLabel>
        <input
          type="date"
          value={expenseDate}
          onChange={(event) => setExpenseDate(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What was this expense for?"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
        />
      </div>

      <div>
        <FieldLabel>Receipt (optional)</FieldLabel>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(event) => setReceipt(event.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-600 hover:file:bg-primary-100 dark:text-slate-300 dark:file:bg-primary-500/10 dark:file:text-primary-400"
        />
        {isEdit && initialData.receipt_url && !receipt && (
          <p className="mt-1 text-xs text-slate-400">
            A receipt is already attached — choose a file to replace it.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading}>
          {isEdit ? "Save Changes" : "Add Expense"}
        </Button>
      </div>
    </form>
  );
}
