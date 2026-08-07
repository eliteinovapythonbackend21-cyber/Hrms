import GenericForm from "@/components/form/GenericForm";
import { useLeadOptions } from "@/hooks/useLookupOptions";

export default function CustomerForm({ formId = "customers-form", initialData, onSubmit, loading }) {
  const leadOptions = useLeadOptions();
  const fields = [
    { name: "customer_name", label: "Customer Name", type: "text", required: true },
    { name: "contact_number", label: "Contact Number", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "address", label: "Address", type: "textarea" },
    { name: "lead_id", label: "Source Lead (optional)", type: "select", options: leadOptions },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
