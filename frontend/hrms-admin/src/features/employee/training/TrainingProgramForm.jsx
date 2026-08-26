import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";

const STATUS_OPTIONS = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "Ongoing", label: "Ongoing" },
  { value: "Completed", label: "Completed" },
];

const PERFORMANCE_OPTIONS = [
  { value: "Not Rated", label: "Not Rated" },
  { value: "Excellent", label: "Excellent" },
  { value: "Good", label: "Good" },
  { value: "Average", label: "Average" },
  { value: "Poor", label: "Poor" },
];

export default function TrainingProgramForm({
  formId = "training-form",
  initialData = {},
  onSubmit,
  loading,
}) {
  const employeeOptions = useEmployeeOptions();

  const fields = [
    {
      name: "employee_id",
      label: "Employee",
      type: "select",
      options: employeeOptions,
      required: true,
      placeholder: "Select employee",
    },

    {
      name: "program_name",
      label: "Program Name",
      type: "text",
      required: true,
      placeholder: "Enter training program name",
    },

    {
      name: "start_date",
      label: "Start Date",
      type: "date",
      required: true,
    },

    {
      name: "end_date",
      label: "End Date",
      type: "date",
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Scheduled",
      placeholder: "Select status",
    },

    {
      name: "performance",
      label: "Performance",
      type: "select",
      options: PERFORMANCE_OPTIONS,
      defaultValue: "Not Rated",
      placeholder: "Select performance rating",
    },
  ];

  return (
    <div className="w-full">
      <GenericForm
        formId={formId}
        fields={fields}
        initialData={initialData}
        onSubmit={onSubmit}
        loading={loading}
      />
    </div>
  );
}