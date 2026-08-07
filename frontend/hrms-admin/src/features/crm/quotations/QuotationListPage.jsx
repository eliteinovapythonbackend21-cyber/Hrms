import GenericListPage from "@/components/table/GenericListPage";
import QuotationForm from "./QuotationForm";
import { crmApi } from "@/api/crm.api";
import { useQuotations, useCreateQuotation, useDeactivateQuotation } from "./useQuotations";
import { formatCurrency } from "@/utils/formatCurrency";

const COLUMNS = [
  { key: "quotation_number", label: "Quotation #" },
  { key: "customer_id", label: "Customer ID" },
  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
  { key: "status", label: "Status" },
];

export default function QuotationListPage() {
  return (
    <GenericListPage
        module="Quotations"
      title="Quotations"
      subtitle="Customer quotations"
      columns={COLUMNS}
      api={crmApi.quotations}
      useList={useQuotations}
      useCreate={useCreateQuotation}
      useRemove={useDeactivateQuotation}
      filename="quotations"
      searchPlaceholder="Search by quotation number..."
      FormComponent={QuotationForm}
      formTitle="Quotation"
      addLabel="Add Quotation"
      actionsMode="none"
      entityLabel="Quotation"
    />
  );
}
