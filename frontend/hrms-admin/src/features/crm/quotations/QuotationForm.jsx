import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Accepted", label: "Accepted" },
  { value: "Rejected", label: "Rejected" },
];

export default function QuotationForm({ formId = "quotations-form", initialData, onSubmit, loading }) {
  const customerOptions = useCustomerOptions();
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", options: customerOptions, required: true },
    { name: "quotation_number", label: "Quotation Number (auto if blank)", type: "text" },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Draft" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
