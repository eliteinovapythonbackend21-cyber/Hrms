import GenericForm from "@/components/form/GenericForm";

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Qualified", label: "Qualified" },
  { value: "Converted", label: "Converted" },
  { value: "Lost", label: "Lost" },
];

export default function LeadForm({ formId = "leads-form", initialData, onSubmit, loading }) {
  const fields = [
    { name: "lead_name", label: "Lead Name", type: "text", required: true },
    { name: "contact_number", label: "Contact Number", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "source", label: "Source", type: "text", placeholder: "e.g. Website, Referral" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "New" },
    { name: "assigned_to", label: "Assigned To (User ID)", type: "number" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
