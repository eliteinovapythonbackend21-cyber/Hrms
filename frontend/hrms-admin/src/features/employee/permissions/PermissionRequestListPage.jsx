import GenericListPage from "@/components/table/GenericListPage";
import PermissionRequestForm from "./PermissionRequestForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { usePermissionRequests, useCreatePermissionRequest, useDeactivatePermissionRequest } from "./usePermissionRequests";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "permission_date", label: "Date" },
  { key: "from_time", label: "From" },
  { key: "to_time", label: "To" },
  { key: "status", label: "Status" },
];

export default function PermissionRequestListPage() {
  return (
    <GenericListPage
        module="Employee Permissions"
      title="Short Leave / Gate Pass"
      subtitle="Employee permission requests"
      columns={COLUMNS}
      api={employeeLifecycleApi.permissions}
      useList={usePermissionRequests}
      useCreate={useCreatePermissionRequest}
      useRemove={useDeactivatePermissionRequest}
      filename="employee-permissions"
      searchPlaceholder="Search by reason or status..."
      FormComponent={PermissionRequestForm}
      formTitle="Permission Request"
      addLabel="Add Request"
      actionsMode="none"
      entityLabel="Permission request"
    />
  );
}
