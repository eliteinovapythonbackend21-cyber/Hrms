import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

export default function DocumentForm({ formId = "employee-documents-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "doc_type", label: "Document Type", type: "text", required: true, placeholder: "e.g. Aadhaar, PAN, Resume" },
    { name: "file_url", label: "File URL", type: "text", required: true, placeholder: "https://..." },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
