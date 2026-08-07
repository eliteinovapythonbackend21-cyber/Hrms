import GenericListPage from "@/components/table/GenericListPage";
import TransferForm from "./TransferForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useTransfers, useCreateTransfer, useDeactivateTransfer } from "./useTransfers";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "from_department_id", label: "From Department" },
  { key: "to_department_id", label: "To Department" },
  { key: "effective_date", label: "Effective Date" },
];

export default function TransferListPage() {
  return (
    <GenericListPage
        module="Transfers"
      title="Transfers"
      subtitle="Employee transfer history"
      columns={COLUMNS}
      api={employeeLifecycleApi.transfers}
      useList={useTransfers}
      useCreate={useCreateTransfer}
      useRemove={useDeactivateTransfer}
      filename="transfers"
      searchPlaceholder="Search by remarks..."
      FormComponent={TransferForm}
      formTitle="Transfer"
      addLabel="Add Transfer"
      actionsMode="none"
      entityLabel="Transfer record"
    />
  );
}
