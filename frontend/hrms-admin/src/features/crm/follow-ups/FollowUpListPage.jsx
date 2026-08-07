import GenericListPage from "@/components/table/GenericListPage";
import FollowUpForm from "./FollowUpForm";
import { crmApi } from "@/api/crm.api";
import { useFollowUps, useCreateFollowUp, useDeactivateFollowUp } from "./useFollowUps";

const COLUMNS = [
  { key: "customer_id", label: "Customer ID" },
  { key: "follow_up_date", label: "Date" },
  { key: "notes", label: "Notes", render: (r) => r.notes || "-" },
];

export default function FollowUpListPage() {
  return (
    <GenericListPage
        module="Follow-ups"
      title="Follow-ups"
      subtitle="Customer follow-up log"
      columns={COLUMNS}
      api={crmApi.followUps}
      useList={useFollowUps}
      useCreate={useCreateFollowUp}
      useRemove={useDeactivateFollowUp}
      filename="follow-ups"
      searchPlaceholder="Search notes..."
      FormComponent={FollowUpForm}
      formTitle="Follow-up"
      addLabel="Add Follow-up"
      actionsMode="none"
      entityLabel="Follow-up"
    />
  );
}
