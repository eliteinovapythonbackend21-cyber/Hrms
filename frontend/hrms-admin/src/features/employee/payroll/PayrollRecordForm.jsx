import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Pending", label: "Pending" },
  { value: "Paid", label: "Paid" },
];

export default function PayrollRecordForm({ formId = "payroll-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const fields = [
    { name: "employee_id", label: "Employee", type: "select", options: employeeOptions, required: true },
    { name: "pay_month", label: "Pay Month", type: "text", placeholder: "YYYY-MM", required: true },
    { name: "gross_salary", label: "Gross Salary", type: "number", required: true },
    { name: "deductions", label: "Deductions", type: "number" },
    { name: "net_salary", label: "Net Salary", type: "number", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, defaultValue: "Pending" },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
