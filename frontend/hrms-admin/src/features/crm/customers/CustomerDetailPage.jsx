import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DataTable from "@/components/table/DataTable";
import { useCustomer } from "./useCustomers";
import { crmApi } from "@/api/crm.api";
import LoadingSpinner from "@/components/feedback/LoadingSpinner";
import Button from "@/components/ui/Button";
import DetailList from "@/components/ui/DetailList";
import TabbedDetailLayout from "@/components/TabbedDetailLayout";
import CustomerSubList from "@/components/CustomerSubList";
import { formatCurrency } from "@/utils/formatCurrency";

// Payments reference invoice_id, not customer_id — resolve the customer's
// invoice ids first, then filter payments against that set.
function CustomerPayments({ customerId }) {
  const { data: invoiceData } = useQuery({
    queryKey: ["invoices", "by-customer", customerId],
    queryFn: async () => (await crmApi.invoices.list({ page: 1, per_page: 500 })).data.data,
    enabled: !!customerId,
  });
  const invoiceIds = new Set((invoiceData?.items || []).filter((i) => String(i.customer_id) === String(customerId)).map((i) => i.id));

  const { data: paymentData, isLoading } = useQuery({
    queryKey: ["payments", "by-customer", customerId],
    queryFn: async () => (await crmApi.payments.list({ page: 1, per_page: 500 })).data.data,
    enabled: !!customerId,
  });
  const rows = (paymentData?.items || []).filter((p) => invoiceIds.has(p.invoice_id));

  return (
    <DataTable
      loading={isLoading}
      data={rows}
      emptyText="No payments recorded."
      columns={[
        { key: "invoice_id", label: "Invoice ID" },
        { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
        { key: "payment_date", label: "Date" },
      ]}
    />
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading, isError } = useCustomer(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !customer) {
    return <div className="text-center py-16 text-slate-500 dark:text-slate-400">Customer not found.</div>;
  }

  const infoRows = [
    { label: "Contact Number", value: customer.contact_number || "-" },
    { label: "Email", value: customer.email || "-" },
    { label: "Address", value: customer.address || "-" },
    { label: "Source Lead ID", value: customer.lead_id || "-" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{customer.customer_name}</h1>
        <Button variant="secondary" onClick={() => navigate("/crm/customers")}>Back</Button>
      </div>

      <div className="card p-6 mb-6">
        <DetailList rows={infoRows} />
      </div>

      <TabbedDetailLayout
        tabs={[
          {
            key: "follow-ups",
            label: "Follow-ups",
            content: (
              <CustomerSubList
                queryKey="follow-ups"
                api={crmApi.followUps}
                customerId={id}
                columns={[
                  { key: "follow_up_date", label: "Date" },
                  { key: "notes", label: "Notes", render: (r) => r.notes || "-" },
                ]}
              />
            ),
          },
          {
            key: "meetings",
            label: "Meetings",
            content: (
              <CustomerSubList
                queryKey="meetings"
                api={crmApi.meetings}
                customerId={id}
                columns={[
                  { key: "meeting_date", label: "Date" },
                  { key: "notes", label: "Notes", render: (r) => r.notes || "-" },
                ]}
              />
            ),
          },
          {
            key: "quotations",
            label: "Quotations",
            content: (
              <CustomerSubList
                queryKey="quotations"
                api={crmApi.quotations}
                customerId={id}
                columns={[
                  { key: "quotation_number", label: "Quotation #" },
                  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
                  { key: "status", label: "Status" },
                ]}
              />
            ),
          },
          {
            key: "invoices",
            label: "Invoices",
            content: (
              <CustomerSubList
                queryKey="invoices"
                api={crmApi.invoices}
                customerId={id}
                columns={[
                  { key: "invoice_number", label: "Invoice #" },
                  { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
                  { key: "due_date", label: "Due Date" },
                  { key: "status", label: "Status" },
                ]}
              />
            ),
          },
          {
            key: "payments",
            label: "Payments",
            content: <CustomerPayments customerId={id} />,
          },
          {
            key: "support-tickets",
            label: "Support Tickets",
            content: (
              <CustomerSubList
                queryKey="support-tickets"
                api={crmApi.supportTickets}
                customerId={id}
                columns={[
                  { key: "subject", label: "Subject" },
                  { key: "status", label: "Status" },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
