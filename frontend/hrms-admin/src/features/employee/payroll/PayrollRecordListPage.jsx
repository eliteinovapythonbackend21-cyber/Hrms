import GenericListPage from "@/components/table/GenericListPage";
import PayrollRecordForm from "./PayrollRecordForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { usePayrollRecords, useCreatePayrollRecord, useDeactivatePayrollRecord } from "./usePayrollRecords";
import { formatCurrency } from "@/utils/formatCurrency";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "pay_month", label: "Pay Month" },
  { key: "gross_salary", label: "Gross Salary", render: (r) => formatCurrency(r.gross_salary) },
  { key: "net_salary", label: "Net Salary", render: (r) => formatCurrency(r.net_salary) },
  { key: "status", label: "Status" },
];

export default function PayrollRecordListPage() {
  return (
    <GenericListPage
        module="Payroll"
      title="Payroll"
      subtitle="Employee payroll records"
      columns={COLUMNS}
      api={employeeLifecycleApi.payroll}
      useList={usePayrollRecords}
      useCreate={useCreatePayrollRecord}
      useRemove={useDeactivatePayrollRecord}
      filename="payroll"
      searchPlaceholder="Search by month or status..."
      FormComponent={PayrollRecordForm}
      formTitle="Payroll Record"
      addLabel="Add Payroll Record"
      actionsMode="none"
      entityLabel="Payroll record"
    />
  );
}
