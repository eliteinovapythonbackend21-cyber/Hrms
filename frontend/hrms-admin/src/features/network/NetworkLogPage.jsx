import { useNetworkLogs } from "./useNetworkLogs";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";
import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";
import { formatDateTime } from "@/utils/formatDate";
import { getUser } from "@/utils/tokenHelpers";
import { networkApi } from "@/api/network.api";

const EXPORT_COLUMNS = [
  { header: "Employee", accessor: (r) => (r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : null) },
  { header: "Status", accessor: (r) => (r.is_online ? "Online" : "Offline") },
  { header: "Network Type", accessor: (r) => r.network_type },
  { header: "Device", accessor: (r) => r.device_name },
  { header: "IP Address", accessor: (r) => r.ip_address },
  { header: "Battery", accessor: (r) => (r.battery_percentage != null ? `${r.battery_percentage}%` : null) },
  {
    header: "Location",
    accessor: (r) => (r.latitude != null && r.longitude != null ? `${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}` : null),
  },
  { header: "Logged At", accessor: (r) => formatDateTime(r.created_at) },
];

export default function NetworkLogPage() {
  const { params, page, perPage, setPage, setPerPage } = usePagination();
  const user = getUser();
  const isAdmin = user?.role === "admin";
  const queryParams = {
    ...params,
    employee_id: !isAdmin && user?.employee?.id ? user.employee.id : undefined,
  };
  const { data, isLoading, isError, isFetching, refetch } = useNetworkLogs(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: networkApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "network-logs",
    title: "Network Logs",
  });

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (r) =>
        r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : "-",
    },
    {
      key: "is_online",
      label: "Status",
      render: (r) => (
        <Badge className={r.is_online ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"}>
          {r.is_online ? "Online" : "Offline"}
        </Badge>
      ),
    },
    { key: "network_type", label: "Network Type", render: (r) => r.network_type || "-" },
    { key: "device_name", label: "Device", render: (r) => r.device_name || "-" },
    { key: "ip_address", label: "IP Address", render: (r) => r.ip_address || "-" },
    { key: "battery_percentage", label: "Battery", render: (r) => (r.battery_percentage != null ? `${r.battery_percentage}%` : "-") },
    {
      key: "coordinates",
      label: "Location",
      render: (r) =>
        r.latitude != null && r.longitude != null
          ? `${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}`
          : "-",
    },
    { key: "created_at", label: "Logged At", render: (r) => formatDateTime(r.created_at) },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Network Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            View network status logs from check-ins
          </p>
        </div>
        <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
      </div>

      <div className="card">
        {isError && <div className="p-4 text-red-600 dark:text-red-400">Failed to load network logs.</div>}
        <DataTable columns={columns} data={data?.items || []} loading={isLoading} />
        <TablePagination
          page={page} pages={data?.pages || 1} total={data?.total || 0}
          perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage}
        />
      </div>
    </div>
  );
}
