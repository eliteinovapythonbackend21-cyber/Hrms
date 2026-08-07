import GenericListPage from "@/components/table/GenericListPage";
import SupportTicketForm from "./SupportTicketForm";
import { crmApi } from "@/api/crm.api";
import { useSupportTickets, useCreateSupportTicket, useDeactivateSupportTicket } from "./useSupportTickets";

const COLUMNS = [
  { key: "customer_id", label: "Customer ID" },
  { key: "subject", label: "Subject" },
  { key: "status", label: "Status" },
];

export default function SupportTicketListPage() {
  return (
    <GenericListPage
        module="Support Tickets"
      title="Support Tickets"
      subtitle="Customer support tickets"
      columns={COLUMNS}
      api={crmApi.supportTickets}
      useList={useSupportTickets}
      useCreate={useCreateSupportTicket}
      useRemove={useDeactivateSupportTicket}
      filename="support-tickets"
      searchPlaceholder="Search by subject or status..."
      FormComponent={SupportTicketForm}
      formTitle="Support Ticket"
      addLabel="Add Ticket"
      actionsMode="none"
      entityLabel="Support ticket"
    />
  );
}
