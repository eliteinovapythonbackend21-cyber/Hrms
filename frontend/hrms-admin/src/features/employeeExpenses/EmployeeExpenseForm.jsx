import { useState } from "react";

import Button from "@/components/ui/Button";
import { useEmployeeExpenseCategories } from "./useEmployeeExpenses";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

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

  const [employeeId, setEmployeeId] = useState(
    initialData.employee_id ?? initialData.employee?.id ?? ""
  );
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
