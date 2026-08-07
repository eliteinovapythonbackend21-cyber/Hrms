import GenericListPage from "@/components/table/GenericListPage";
import TrainingProgramForm from "./TrainingProgramForm";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useTrainingPrograms, useCreateTrainingProgram, useDeactivateTrainingProgram } from "./useTrainingPrograms";

const COLUMNS = [
  { key: "employee_id", label: "Employee ID" },
  { key: "program_name", label: "Program" },
  { key: "start_date", label: "Start Date" },
  { key: "end_date", label: "End Date", render: (r) => r.end_date || "-" },
  { key: "status", label: "Status" },
];

export default function TrainingProgramListPage() {
  return (
    <GenericListPage
        module="Training"
      title="Training"
      subtitle="Employee training program records"
      columns={COLUMNS}
      api={employeeLifecycleApi.training}
      useList={useTrainingPrograms}
      useCreate={useCreateTrainingProgram}
      useRemove={useDeactivateTrainingProgram}
      filename="training"
      searchPlaceholder="Search by program or status..."
      FormComponent={TrainingProgramForm}
      formTitle="Training Program"
      addLabel="Add Training"
      actionsMode="none"
      entityLabel="Training record"
    />
  );
}
