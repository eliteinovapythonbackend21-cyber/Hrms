import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useLeaves } from "./useLeaves";
import LeaveTable from "./components/LeaveTable";
import { usePagination } from "@/hooks/usePagination";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";
import { useTableExport } from "@/hooks/useTableExport";
import TablePagination from "@/components/table/TablePagination";
import TableSearchBar from "@/components/table/TableSearchBar";
import TableToolbar from "@/components/table/TableToolbar";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { getUser } from "@/utils/tokenHelpers";
import { masterApi } from "@/api/master.api";
import { leavesApi } from "@/api/leaves.api";
import { formatDate } from "@/utils/formatDate";

const EXPORT_COLUMNS = [
  { header: "Employee", accessor: (r) => (r.employee ? `${r.employee.first_name} ${r.employee.last_name}`.trim() : null) },
  { header: "Leave Type", accessor: (r) => r.leave_type?.name },
  { header: "From", accessor: (r) => formatDate(r.from_date) },
  { header: "To", accessor: (r) => formatDate(r.to_date) },
  { header: "Days", accessor: (r) => r.total_days },
  { header: "Reason", accessor: (r) => r.reason },
  { header: "Status", accessor: (r) => r.status },
];

export default function LeaveListPage() {
  const { params, page, perPage, setPage, setPerPage, sortBy, sortDir, toggleSort } = usePagination();
  const { value: search, setValue: setSearch, debouncedValue: debouncedSearch } = useDebouncedSearch();
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const { data: leaveTypes } = useQuery({
    queryKey: ["leave-types", { page: 1, per_page: 100 }],
    queryFn: async () => (await masterApi.listLeaveTypes({ page: 1, per_page: 100 })).data.data,
  });

  const queryParams = {
    ...params,
    search: debouncedSearch || undefined,
    leave_type: leaveTypeFilter || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useLeaves(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: leavesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "leaves",
    title: "Leaves",
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leaves</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage leave requests
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar onRefresh={refetch} refreshing={isFetching} onExportExcel={exportExcel} onExportPDF={exportPDF} exporting={exporting} />
          {isAdmin && (
            <Link to="/leaves/approvals">
              <Button variant="secondary">Approvals</Button>
            </Link>
          )}
          <Link to="/leaves/new">
            <Button>Request Leave</Button>
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <TableSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by status..."
            className="sm:max-w-xs"
          />
          <Select
            value={leaveTypeFilter}
            onChange={(e) => setLeaveTypeFilter(e.target.value)}
            placeholder="All leave types"
            options={(leaveTypes?.items || []).map((lt) => ({ value: lt.id, label: lt.name }))}
            className="sm:w-56"
          />
        </div>
        {isError && (
          <div className="p-4 text-red-600 dark:text-red-400">Failed to load leaves.</div>
        )}
        <LeaveTable
          data={data?.items || []}
          loading={isLoading}
          isAdmin={isAdmin}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={toggleSort}
        />
        <TablePagination
          page={page}
          pages={data?.pages || 1}
          total={data?.total || 0}
          perPage={perPage}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
        />
      </div>
    </div>
  );
}
