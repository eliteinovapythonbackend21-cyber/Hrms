import GenericForm from "@/components/form/GenericForm";

const FIELDS = [
  { name: "name", label: "Holiday Name", type: "text", required: true },
  { name: "holiday_date", label: "Holiday Date", type: "date", required: true },
  { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
];

export default function HolidayForm({ formId = "holidays-form", initialData, onSubmit, loading, onCancel, isEdit }) {
  return (
    <GenericForm
      formId={formId}
      fields={FIELDS}
      initialData={initialData}
      onSubmit={onSubmit}
      loading={loading}
      onCancel={onCancel}
      isEdit={isEdit}
    />
  );
}
