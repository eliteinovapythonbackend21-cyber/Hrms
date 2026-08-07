import GenericListPage from "@/components/table/GenericListPage";
import ExpenseForm from "./ExpenseForm";
import { financeApi } from "@/api/finance.api";
import { useExpenses, useCreateExpense, useDeactivateExpense } from "./useExpenses";
import { formatCurrency } from "@/utils/formatCurrency";

const COLUMNS = [
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
  { key: "expense_date", label: "Date" },
  { key: "account_id", label: "Account ID" },
];

export default function ExpenseListPage() {
  return (
    <GenericListPage
        module="Expenses"
      title="Expenses"
      subtitle="Recorded business expenses"
      columns={COLUMNS}
      api={financeApi.expenses}
      useList={useExpenses}
      useCreate={useCreateExpense}
      useRemove={useDeactivateExpense}
      filename="expenses"
      searchPlaceholder="Search by category..."
      FormComponent={ExpenseForm}
      formTitle="Expense"
      addLabel="Add Expense"
      actionsMode="none"
      entityLabel="Expense"
    />
  );
}
