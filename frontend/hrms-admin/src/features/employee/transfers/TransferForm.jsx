import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions, useDepartmentOptions } from "@/hooks/useLookupOptions";

export default function TransferForm({ formId = "transfers-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const departmentOptions = useDepartmentOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "from_department_id", label: "From Department", type: "select", options: departmentOptions, required: true },
    { name: "to_department_id", label: "To Department", type: "select", options: departmentOptions, required: true },
    { name: "effective_date", label: "Effective Date", type: "date", required: true },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
