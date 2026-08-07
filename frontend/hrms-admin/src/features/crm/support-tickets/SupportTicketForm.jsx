import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In Progress" },
  { value: "Resolved", label: "Resolved" },
  { value: "Closed", label: "Closed" },
];

export default function SupportTicketForm({ formId = "support-tickets-form", initialData, onSubmit, loading }) {
  const customerOptions = useCustomerOptions();
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", options: customerOptions, required: true },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Open" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
