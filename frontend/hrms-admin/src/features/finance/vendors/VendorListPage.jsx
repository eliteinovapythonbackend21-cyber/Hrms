import GenericListPage from "@/components/table/GenericListPage";
import VendorForm from "./VendorForm";
import { financeApi } from "@/api/finance.api";
import { useVendors, useCreateVendor, useUpdateVendor, useDeactivateVendor } from "./useVendors";

const COLUMNS = [
  { key: "vendor_name", label: "Vendor Name" },
  { key: "contact_number", label: "Contact", render: (r) => r.contact_number || "-" },
  { key: "gstin", label: "GSTIN", render: (r) => r.gstin || "-" },
];

export default function VendorListPage() {
  return (
    <GenericListPage
        module="Vendors"
      title="Vendors"
      subtitle="Finance vendor master"
      columns={COLUMNS}
      api={financeApi.vendors}
      useList={useVendors}
      useCreate={useCreateVendor}
      useUpdate={useUpdateVendor}
      useRemove={useDeactivateVendor}
      filename="vendors"
      searchPlaceholder="Search by vendor name or GSTIN..."
      FormComponent={VendorForm}
      formTitle="Vendor"
      addLabel="Add Vendor"
      actionsMode="none"
      entityLabel="Vendor"
    />
  );
}
