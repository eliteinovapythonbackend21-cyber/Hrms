import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

// NOTE: the backend resignations module has no PUT/update route (same
// create/list/delete-only factory as every other lifecycle module), so
// there is no separate "approve" action — status is set here at creation
// time. Exit Management can only be created once a resignation's status is
// the literal string "Approved" (enforced server-side).
const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export default function ResignationForm({ formId = "resignations-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "notice_date", label: "Notice Date", type: "date", required: true },
    { name: "last_working_date", label: "Last Working Date", type: "date", required: true },
    { name: "reason", label: "Reason", type: "textarea" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Pending" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
