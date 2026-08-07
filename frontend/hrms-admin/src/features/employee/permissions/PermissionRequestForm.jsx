import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export default function PermissionRequestForm({ formId = "employee-permissions-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "permission_date", label: "Date", type: "date", required: true },
    { name: "from_time", label: "From Time", type: "text", placeholder: "HH:MM", required: true },
    { name: "to_time", label: "To Time", type: "text", placeholder: "HH:MM", required: true },
    { name: "reason", label: "Reason", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Pending" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
