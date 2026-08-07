import GenericForm from "@/components/form/GenericForm";
import { useAccountOptions } from "@/hooks/useLookupOptions";

export default function IncomeForm({ formId = "income-form", initialData, onSubmit, loading }) {
  const accountOptions = useAccountOptions();
  const fields = [
    { name: "account_id", label: "Account", type: "select", options: accountOptions, required: true },
    { name: "source", label: "Source", type: "text", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "income_date", label: "Income Date", type: "date", required: true },
  ];
  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      loading={loading}
      readOnlyBanner="Recording income credits the selected account's balance."
    />
  );
}
