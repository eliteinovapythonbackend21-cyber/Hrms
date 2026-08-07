import GenericForm from "@/components/form/GenericForm";
import { useCustomerOptions } from "@/hooks/useLookupOptions";

export default function MeetingForm({ formId = "meetings-form", initialData, onSubmit, loading }) {
  const customerOptions = useCustomerOptions();
  const fields = [
    { name: "customer_id", label: "Customer", type: "select", options: customerOptions, required: true },
    { name: "meeting_date", label: "Meeting Date", type: "date", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
