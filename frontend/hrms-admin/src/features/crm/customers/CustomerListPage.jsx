import { useNavigate } from "react-router-dom";
import GenericListPage from "@/components/table/GenericListPage";
import CustomerForm from "./CustomerForm";
import { crmApi } from "@/api/crm.api";
import { useCustomers, useCreateCustomer, useDeactivateCustomer } from "./useCustomers";

export default function CustomerListPage() {
  const navigate = useNavigate();
  const columns = [
    {
      key: "customer_name",
      label: "Customer Name",
      render: (r) => (
        <button onClick={() => navigate(`/crm/customers/${r.id}`)} className="text-primary-600 hover:underline">
          {r.customer_name}
        </button>
      ),
    },
    { key: "contact_number", label: "Contact", render: (r) => r.contact_number || "-" },
    { key: "email", label: "Email", render: (r) => r.email || "-" },
    { key: "address", label: "Address", render: (r) => r.address || "-" },
  ];

  return (
    <GenericListPage
        module="Customers"
      title="Customers"
      subtitle="Converted and directly created customers"
      columns={columns}
      api={crmApi.customers}
      useList={useCustomers}
      useCreate={useCreateCustomer}
      useRemove={useDeactivateCustomer}
      filename="customers"
      searchPlaceholder="Search by name, phone, or email..."
      FormComponent={CustomerForm}
      formTitle="Customer"
      addLabel="Add Customer"
      actionsMode="none"
      entityLabel="Customer"
    />
  );
}
