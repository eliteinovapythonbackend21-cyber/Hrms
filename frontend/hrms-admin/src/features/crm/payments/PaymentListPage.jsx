import GenericListPage from "@/components/table/GenericListPage";
import PaymentForm from "./PaymentForm";
import { crmApi } from "@/api/crm.api";
import { usePayments, useCreatePayment, useDeactivatePayment } from "./usePayments";
import { formatCurrency } from "@/utils/formatCurrency";

const COLUMNS = [
  { key: "invoice_id", label: "Invoice ID" },
  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
  { key: "payment_date", label: "Date" },
  { key: "mode", label: "Mode", render: (r) => r.mode || "-" },
];

export default function PaymentListPage() {
  return (
    <GenericListPage
        module="Payments"
      title="Payments"
      subtitle="Payments received against invoices"
      columns={COLUMNS}
      api={crmApi.payments}
      useList={usePayments}
      useCreate={useCreatePayment}
      useRemove={useDeactivatePayment}
      filename="payments"
      searchPlaceholder="Search by mode..."
      FormComponent={PaymentForm}
      formTitle="Payment"
      addLabel="Add Payment"
      actionsMode="none"
      entityLabel="Payment"
    />
  );
}
