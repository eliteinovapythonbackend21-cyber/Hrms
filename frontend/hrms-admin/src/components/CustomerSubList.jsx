import { useQuery } from "@tanstack/react-query";
import DataTable from "@/components/table/DataTable";

// Read-only sub-list for the Customer detail page tabs — same
// client-side-filter approach as EmployeeSubList (list endpoints don't
// expose a customer_id query filter).
export default function CustomerSubList({ queryKey, api, customerId, columns, emptyText }) {
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, "by-customer", customerId],
    queryFn: async () => (await api.list({ page: 1, per_page: 500 })).data.data,
    enabled: !!customerId,
  });

  const rows = (data?.items || []).filter((r) => String(r.customer_id) === String(customerId));

  return <DataTable columns={columns} data={rows} loading={isLoading} emptyText={emptyText || "No records found"} />;
}
