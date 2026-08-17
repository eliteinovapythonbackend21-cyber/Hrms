import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export default function ResignationForm({ formId = "resignations-form", initialData, onSubmit, loading, isEdit }) {
  const employeeOptions = useEmployeeOptions();

  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "notice_date", label: "Notice Date", type: "date", required: true },
    { name: "last_working_date", label: "Last Working Date", type: "date", required: true },
    { name: "reason", label: "Reason", type: "textarea" },
    // Status is only shown when editing — approving/rejecting a
    // resignation is now something you do via Edit, not at creation time.
    // New resignations always start "Pending" (see handleSubmit below).
    ...(isEdit ? [{ name: "status", label: "Status", type: "select", options: STATUS_OPTIONS }] : []),
  ];

  const handleSubmit = (payload) => {
    onSubmit(isEdit ? payload : { ...payload, status: "Pending" });
  };

  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={handleSubmit} loading={loading} />;
}