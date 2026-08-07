import GenericForm from "@/components/form/GenericForm";
import { useApprovedResignationOptions } from "@/hooks/useLookupOptions";

const CLEARANCE_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Cleared", label: "Cleared" },
];

// Only reachable via "Start exit clearance" on an approved Resignation row —
// resignation_id is pre-filled by ResignationListPage / ExitManagementListPage.
export default function ExitManagementForm({ formId = "exit-management-form", initialData, onSubmit, loading }) {
  const resignationOptions = useApprovedResignationOptions();
  const fields = [
    { name: "resignation_id", label: "Resignation", type: "select", options: resignationOptions, required: true, disabled: !!initialData?.resignation_id },
    { name: "clearance_status", label: "Clearance Status", type: "select", options: CLEARANCE_OPTIONS, defaultValue: "Pending" },
    { name: "exit_date", label: "Exit Date", type: "date", required: true },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ];
  return (
    <GenericForm
      formId={formId}
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      loading={loading}
      readOnlyBanner="Exit management can only be created for an approved resignation."
    />
  );
}
