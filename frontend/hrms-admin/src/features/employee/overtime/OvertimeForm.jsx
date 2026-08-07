import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export default function OvertimeForm({ formId = "overtime-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "overtime_date", label: "Date", type: "date", required: true },
    { name: "hours", label: "Hours", type: "number", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Pending" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
