import { useNavigate } from "react-router-dom";
import GenericListPage from "@/components/table/GenericListPage";
import ResignationForm from "./ResignationForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useResignations, useCreateResignation, useDeactivateResignation } from "./useResignations";
import Badge from "@/components/ui/Badge";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "notice_date", label: "Notice Date" },
  { key: "last_working_date", label: "Last Working Date" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <Badge className={r.status === "Approved" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"}>
        {r.status || "Pending"}
      </Badge>
    ),
  },
];

// Exit Management is only reachable from an approved Resignation row — see
// "Start exit clearance" row action below, rather than a bare Add button
// on the Exit Management screen itself.
export default function ResignationListPage() {
  const navigate = useNavigate();

  return (
    <GenericListPage
        module="Resignations"
      title="Resignations"
      subtitle="Employee resignation records"
      columns={COLUMNS}
      api={employeeLifecycleApi.resignations}
      useList={useResignations}
      useCreate={useCreateResignation}
      useRemove={useDeactivateResignation}
      filename="resignations"
      searchPlaceholder="Search by reason or status..."
      FormComponent={ResignationForm}
      formTitle="Resignation"
      addLabel="Add Resignation"
      actionsMode="none"
      entityLabel="Resignation"
      renderRowExtra={(row) =>
        row.status === "Approved" ? (
          <button
            onClick={() => navigate(`/employee/exit-management?resignation_id=${row.id}`)}
            className="text-primary-600 hover:underline text-sm"
          >
            Start exit clearance
          </button>
        ) : null
      }
    />
  );
}
