import GenericForm from "@/components/form/GenericForm";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";


const STATUS_OPTIONS = [
  {
    value: "Pending",
    label: "Pending",
  },

  {
    value: "Approved",
    label: "Approved",
  },

  {
    value: "Rejected",
    label: "Rejected",
  },
];


export default function OvertimeForm({
  formId = "overtime-form",
  initialData = {},
  onSubmit,
  loading,
}) {
  const employeeOptions =
    useEmployeeOptions();


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
      name: "overtime_date",
      label: "Overtime Date",
      type: "date",
      required: true,
    },

    {
      name: "hours",
      label: "Hours",
      type: "number",
      required: true,
      placeholder: "Enter overtime hours",
    },

    {
      name: "description",
      label: "Overtime Description",
      type: "textarea",
      required: false,
      placeholder:
        "Enter the reason or details for this overtime record",
    },

    {
      name: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      defaultValue: "Pending",
      placeholder: "Select status",
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