import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions, useQuotationOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Unpaid", label: "Unpaid" },
  { value: "Paid", label: "Paid" },
  { value: "Overdue", label: "Overdue" },
];

export default function InvoiceForm({ formId = "invoices-form", initialData, onSubmit, loading }) {
  const customerOptions = useCustomerOptions();
  const quotationOptions = useQuotationOptions();
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", options: customerOptions, required: true },
    { name: "quotation_id", label: "Quotation (optional)", type: "select", options: quotationOptions },
    { name: "invoice_number", label: "Invoice Number (auto if blank)", type: "text" },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "due_date", label: "Due Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Unpaid" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
