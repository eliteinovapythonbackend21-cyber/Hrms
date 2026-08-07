import GenericListPage from "@/components/table/GenericListPage";
import MeetingForm from "./MeetingForm";
import { crmApi } from "@/api/crm.api";
import { useMeetings, useCreateMeeting, useDeactivateMeeting } from "./useMeetings";

const COLUMNS = [
  { key: "customer_id", label: "Customer ID" },
  { key: "meeting_date", label: "Date" },
  { key: "notes", label: "Notes", render: (r) => r.notes || "-" },
];

export default function MeetingListPage() {
  return (
    <GenericListPage
        module="Meetings"
      title="Meetings"
      subtitle="Customer meeting log"
      columns={COLUMNS}
      api={crmApi.meetings}
      useList={useMeetings}
      useCreate={useCreateMeeting}
      useRemove={useDeactivateMeeting}
      filename="meetings"
      searchPlaceholder="Search notes..."
      FormComponent={MeetingForm}
      formTitle="Meeting"
      addLabel="Add Meeting"
      actionsMode="none"
      entityLabel="Meeting"
    />
  );
}
