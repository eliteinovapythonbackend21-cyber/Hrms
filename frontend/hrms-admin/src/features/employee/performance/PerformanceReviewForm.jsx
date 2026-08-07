import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

export default function PerformanceReviewForm({ formId = "performance-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "review_period", label: "Review Period", type: "text", placeholder: "e.g. 2026-Q1", required: true },
    { name: "rating", label: "Rating (1-5)", type: "number", required: true },
    { name: "remarks", label: "Remarks", type: "textarea" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
