import GenericListPage from "@/components/table/GenericListPage";
import HolidayForm from "./HolidayForm";
import { holidayApi } from "@/api/master.api";
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeactivateHoliday } from "./useHolidays";
import { formatDate } from "@/utils/formatDate";
import Badge from "@/components/ui/Badge";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "holiday_date", label: "Date", render: (r) => formatDate(r.holiday_date) },
  {
    key: "is_active",
    label: "Status",
    render: (r) => (
      <Badge className={r.is_active ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
        {r.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function HolidayListPage() {
  return (
    <GenericListPage
      title="Holidays"
      subtitle="Manage organization holidays"
      columns={COLUMNS}
      api={holidayApi}
      useList={useHolidays}
      useCreate={useCreateHoliday}
      useUpdate={useUpdateHoliday}
      useRemove={useDeactivateHoliday}
      filename="holidays"
      searchPlaceholder="Search holidays..."
      FormComponent={HolidayForm}
      formTitle="Holiday"
      addLabel="Add Holiday"
      actionsMode="master"
      entityLabel="Holiday"
      module="Holidays"
    />
  );
}
