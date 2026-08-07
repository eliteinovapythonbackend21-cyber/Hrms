import GenericListPage from "@/components/table/GenericListPage";
import IncomeForm from "./IncomeForm";
import { financeApi } from "@/api/finance.api";
import { useIncome, useCreateIncome, useDeactivateIncome } from "./useIncome";
import { formatCurrency } from "@/utils/formatCurrency";

const COLUMNS = [
  { key: "source", label: "Source" },
  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
  { key: "income_date", label: "Date" },
  { key: "account_id", label: "Account ID" },
];

export default function IncomeListPage() {
  return (
    <GenericListPage
        module="Income"
      title="Income"
      subtitle="Recorded business income"
      columns={COLUMNS}
      api={financeApi.income}
      useList={useIncome}
      useCreate={useCreateIncome}
      useRemove={useDeactivateIncome}
      filename="income"
      searchPlaceholder="Search by source..."
      FormComponent={IncomeForm}
      formTitle="Income"
      addLabel="Add Income"
      actionsMode="none"
      entityLabel="Income record"
    />
  );
}
