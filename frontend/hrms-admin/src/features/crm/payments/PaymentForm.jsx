import GenericForm from "@/components/form/GenericForm";
import { useInvoiceOptions } from "@/hooks/useLookupOptions";

export default function PaymentForm({ formId = "payments-form", initialData, onSubmit, loading }) {
  const invoiceOptions = useInvoiceOptions();
  const fields = [
    { name: "invoice_id", label: "Invoice", type: "select", options: invoiceOptions, required: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "payment_date", label: "Payment Date", type: "date", required: true },
    { name: "mode", label: "Mode", type: "text", placeholder: "e.g. Cash, Bank Transfer, UPI" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
