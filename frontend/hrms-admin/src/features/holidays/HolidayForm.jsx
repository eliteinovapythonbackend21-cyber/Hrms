import GenericForm from "@/components/form/GenericForm";

const HOLIDAY_TYPE_OPTIONS = [
  { value: "Government", label: "Government Holiday" },
  { value: "Office", label: "Office Holiday" },
];

const FIELDS = [
  { name: "name", label: "Holiday Name", type: "text", required: true },
  { name: "holiday_date", label: "Holiday Date", type: "date", required: true },
  {
    name: "holiday_type",
    label: "Holiday Type",
    type: "select",
    options: HOLIDAY_TYPE_OPTIONS,
    required: true,
    defaultValue: "Office",
  },
  { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
];

export default function HolidayForm({ formId = "holidays-form", initialData, onSubmit, loading, onCancel, isEdit }) {
  const normalizedInitialData = {
    ...(initialData || {}),
    holiday_type: initialData?.holiday_type || "Office",
  };

  return (
    <GenericForm
      formId={formId}
      fields={FIELDS}
      initialData={normalizedInitialData}
      onSubmit={onSubmit}
      loading={loading}
      onCancel={onCancel}
      isEdit={isEdit}
    />
  );
}