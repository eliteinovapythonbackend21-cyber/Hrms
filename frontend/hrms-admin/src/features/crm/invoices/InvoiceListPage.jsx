import GenericListPage from "@/components/table/GenericListPage";
import InvoiceForm from "./InvoiceForm";
import { crmApi } from "@/api/crm.api";
import { useInvoices, useCreateInvoice, useDeactivateInvoice } from "./useInvoices";
import { formatCurrency } from "@/utils/formatCurrency";
import Badge from "@/components/ui/Badge";

const COLUMNS = [
  { key: "invoice_number", label: "Invoice #" },
  { key: "customer_id", label: "Customer ID" },
  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
  { key: "due_date", label: "Due Date" },
  {
    key: "status",
    label: "Status",
    render: (r) => (
      <Badge className={r.status === "Paid" ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300"}>
        {r.status || "Unpaid"}
      </Badge>
    ),
  },
];

export default function InvoiceListPage() {
  return (
    <GenericListPage
        module="Invoices"
      title="Invoices"
      subtitle="Customer invoices"
      columns={COLUMNS}
      api={crmApi.invoices}
      useList={useInvoices}
      useCreate={useCreateInvoice}
      useRemove={useDeactivateInvoice}
      filename="invoices"
      searchPlaceholder="Search by invoice number..."
      FormComponent={InvoiceForm}
      formTitle="Invoice"
      addLabel="Add Invoice"
      actionsMode="none"
      entityLabel="Invoice"
    />
  );
}
