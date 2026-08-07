import GenericForm from "@/components/form/GenericForm";

export default function VendorForm({ formId = "vendors-form", initialData, onSubmit, loading }) {
  const fields = [
    { name: "vendor_name", label: "Vendor Name", type: "text", required: true },
    { name: "contact_number", label: "Contact Number", type: "text" },
    { name: "gstin", label: "GSTIN", type: "text" },
    { name: "is_active", label: "Active", type: "checkbox", defaultValue: true },
  ];
  return <GenericForm formId={formId} fields={fields} initialData={initialData} onSubmit={onSubmit} loading={loading} />;
}
