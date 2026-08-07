import GenericForm from "@/components/form/GenericForm";

const FIELDS = [
  { name: "name", label: "Holiday Name", type: "text", required: true },
  { name: "holiday_date", label: "Holiday Date", type: "date", required: true },
  { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
];

export default function HolidayForm({ formId = "holiday-form", initialData, onSubmit, loading }) {
  return (
    <GenericForm
      formId={formId}
      fields={FIELDS}
      initialData={initialData}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
}
