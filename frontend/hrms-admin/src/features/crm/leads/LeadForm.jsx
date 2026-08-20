import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "New", label: "New" },
  { value: "Contacted", label: "Contacted" },
  { value: "Qualified", label: "Qualified" },
  { value: "Converted", label: "Converted" },
  { value: "Lost", label: "Lost" },
];

export default function LeadForm({ formId = "leads-form", initialData, onSubmit, loading }) {
  // NOTE: useEmployeeOptions() as used elsewhere in this app (see
  // TransferForm / PromotionForm) returns all active employees, not
  // scoped to CRM only. If you need this restricted to CRM Voice /
  // Non-Voice staff specifically, that filtering needs to happen
  // where useEmployeeOptions is defined (or via a CRM-specific
  // variant), since it isn't scoped here.
  const employeeOptions = useEmployeeOptions();

  const fields = [
    { name: "lead_name", label: "Lead Name", type: "text", required: true },
    { name: "contact_number", label: "Contact Number", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "source", label: "Source", type: "text", placeholder: "e.g. Website, Referral" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "New" },
    {
      name: "created_by",
      label: "Lead Created By (CRM Employee)",
      type: "select",
      options: employeeOptions,
    },
    {
      name: "assigned_to",
      label: "Assigned To (CRM Employee)",
      type: "select",
      options: employeeOptions,
    },
  ];

  // Normalize both employee references the same way TransferForm /
  // PromotionForm do: fall back from the flat id field to the nested
  // relationship object's id, so editing an existing lead pre-fills
  // both dropdowns correctly.
  const normalizedInitialData = {
    ...initialData,
    created_by:
      initialData?.created_by ??
      initialData?.creator?.id ??
      "",
    assigned_to:
      initialData?.assigned_to ??
      initialData?.assignee?.id ??
      "",
  };

  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={normalizedInitialData}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
}