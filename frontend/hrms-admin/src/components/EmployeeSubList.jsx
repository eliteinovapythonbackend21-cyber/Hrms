import { useQuery } from "@tanstack/react-query";
import DataTable from "@/components/table/DataTable";

// Read-only sub-list for the Employee detail page tabs. The backend list
// endpoints don't expose an employee_id filter query param (only `search`
// on a handful of text columns), so we fetch a large page and filter
// client-side — acceptable at this data scale (add-only lifecycle tables).
export default function EmployeeSubList({ queryKey, api, employeeId, columns, emptyText }) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, "by-employee", employeeId],
    queryFn: async () => (await api.list({ page: 1, per_page: 500 })).data.data,
    enabled: !!employeeId,
  });

  const rows = (data?.items || []).filter((r) => String(r.employee_id) === String(employeeId));

  return <DataTable columns={columns} data={rows} loading={isLoading} emptyText={emptyText || "No records found"} />;
}
