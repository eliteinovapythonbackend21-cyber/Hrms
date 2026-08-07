import GenericListPage from "@/components/table/GenericListPage";
import OvertimeForm from "./OvertimeForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useOvertime, useCreateOvertime, useDeactivateOvertime } from "./useOvertime";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "overtime_date", label: "Date" },
  { key: "hours", label: "Hours" },
  { key: "status", label: "Status" },
];

export default function OvertimeListPage() {
  return (
    <GenericListPage
        module="Overtime"
      title="Overtime"
      subtitle="Employee overtime records"
      columns={COLUMNS}
      api={employeeLifecycleApi.overtime}
      useList={useOvertime}
      useCreate={useCreateOvertime}
      useRemove={useDeactivateOvertime}
      filename="overtime"
      searchPlaceholder="Search by status..."
      FormComponent={OvertimeForm}
      formTitle="Overtime Record"
      addLabel="Add Overtime"
      actionsMode="none"
      entityLabel="Overtime record"
    />
  );
}
