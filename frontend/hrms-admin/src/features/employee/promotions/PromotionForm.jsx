import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions, useDesignationOptions } from "@/hooks/useLookupOptions";

export default function PromotionForm({ formId = "promotions-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const designationOptions = useDesignationOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "from_designation_id", label: "From Designation", type: "select", options: designationOptions, required: true },
    { name: "to_designation_id", label: "To Designation", type: "select", options: designationOptions, required: true },
    { name: "effective_date", label: "Effective Date", type: "date", required: true },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
