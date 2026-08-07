import { useSearchParams } from "react-router-dom";
import GenericListPage from "@/components/table/GenericListPage";
import ExitManagementForm from "./ExitManagementForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useExitManagement, useCreateExitManagement, useDeactivateExitManagement } from "./useExitManagement";

const COLUMNS = [
  { key: "resignation_id", label: "Resignation ID" },
  { key: "clearance_status", label: "Clearance Status" },
  { key: "exit_date", label: "Exit Date" },
];

// No bare "+Add" button here — this screen is only reached with a
// resignation_id in the query string, arriving from the "Start exit
// clearance" row action on an approved Resignation (see
// ResignationListPage.jsx).
export default function ExitManagementListPage() {
  const [searchParams] = useSearchParams();
  const resignationId = searchParams.get("resignation_id");

  return (
    <GenericListPage
        module="Exit Management"
      title="Exit Management"
      subtitle="Exit clearance records for approved resignations"
      columns={COLUMNS}
      api={employeeLifecycleApi.exitManagement}
      useList={useExitManagement}
      useCreate={useCreateExitManagement}
      useRemove={useDeactivateExitManagement}
      filename="exit-management"
      searchPlaceholder="Search by clearance status..."
      FormComponent={ExitManagementForm}
      formTitle="Exit Clearance"
      hideAdd
      actionsMode="none"
      entityLabel="Exit management record"
      autoOpenCreateWith={resignationId ? { resignation_id: Number(resignationId) } : null}
    />
  );
}
