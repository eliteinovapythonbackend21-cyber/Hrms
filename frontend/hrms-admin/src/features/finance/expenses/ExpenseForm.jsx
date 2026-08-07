import GenericForm from "@/components/form/GenericForm";
import { useAccountOptions, useVendorOptions } from "@/hooks/useLookupOptions";

export default function ExpenseForm({ formId = "expenses-form", initialData, onSubmit, loading }) {
  const accountOptions = useAccountOptions();
  const vendorOptions = useVendorOptions();
  const fields = [
    { name: "account_id", label: "Account", type: "select", options: accountOptions, required: true },
    { name: "vendor_id", label: "Vendor (optional)", type: "select", options: vendorOptions },
    { name: "category", label: "Category", type: "text", required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "expense_date", label: "Expense Date", type: "date", required: true },
  ];
  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      loading={loading}
      readOnlyBanner="Recording an expense debits the selected account's balance."
    />
  );
}
