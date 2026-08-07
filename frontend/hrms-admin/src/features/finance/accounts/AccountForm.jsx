import GenericForm from "@/components/form/GenericForm";

const TYPE_OPTIONS = [
  { value: "Bank", label: "Bank" },
  { value: "Cash", label: "Cash" },
  { value: "Credit Card", label: "Credit Card" },
];

export default function AccountForm({ formId = "accounts-form", initialData, onSubmit, loading }) {
  const fields = [
    { name: "account_name", label: "Account Name", type: "text", required: true },
    { name: "account_type", label: "Account Type", type: "select", options: TYPE_OPTIONS, required: true },
    { name: "balance", label: "Balance", type: "number", defaultValue: 0 },
    { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
