import { useMemo, useState } from "react";
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
  {
    header: "Employee",
    accessor: (r) =>
      r.employee
        ? `${r.employee.first_name} ${r.employee.last_name}`.trim()
        : null,
  },
  {
    header: "Leave Type",
    accessor: (r) => r.leave_type?.name,
  },
  {
    header: "From",
    accessor: (r) => formatDate(r.from_date),
  },
  {
    header: "To",
    accessor: (r) => formatDate(r.to_date),
  },
  {
    header: "Days",
    accessor: (r) => r.total_days,
  },
  {
    header: "Reason",
    accessor: (r) => r.reason,
  },
  {
    header: "Status",
    accessor: (r) => r.status,
  },
];

function StatIcon({ type }) {
  if (type === "total") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
        <path d="M8 14h2M14 14h2M8 18h2" />
      </svg>
    );
  }

  if (type === "pending") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (type === "approved") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

function StatCard({ title, value, description, type }) {
  const styles = {
    total: {
      wrapper:
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
      icon: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    },
    pending: {
      wrapper:
        "border-amber-200 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-900/10",
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    },
    approved: {
      wrapper:
        "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-900/10",
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    rejected: {
      wrapper:
        "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-900/10",
      icon: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${styles[type].wrapper}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[type].icon}`}
        >
          <StatIcon type={type} />
        </div>
      </div>
    </div>
  );
}

export default function LeaveListPage() {
  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
    sortBy,
    sortDir,
    toggleSort,
  } = usePagination();

  const {
    value: search,
    setValue: setSearch,
    debouncedValue: debouncedSearch,
  } = useDebouncedSearch();

  const [leaveTypeFilter, setLeaveTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const user = getUser();
  const isAdmin = user?.role === "admin";

  const { data: leaveTypes, isLoading: loadingLeaveTypes } = useQuery({
    queryKey: ["leave-types", { page: 1, per_page: 100, is_active: true }],
    queryFn: async () =>
      (
        await masterApi.listLeaveTypes({
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
  });

  const queryParams = {
    ...params,
    search: debouncedSearch || undefined,
    leave_type: leaveTypeFilter || undefined,
    status: statusFilter || undefined,
  };

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useLeaves(queryParams);

  const leaves = data?.items || [];

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: leavesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "leaves",
    title: "Leaves",
  });

  const stats = useMemo(() => {
    const pageLeaves = leaves;

    return {
      total: data?.total || 0,
      pending: pageLeaves.filter(
        (item) => item.status?.toLowerCase() === "pending"
      ).length,
      approved: pageLeaves.filter(
        (item) => item.status?.toLowerCase() === "approved"
      ).length,
      rejected: pageLeaves.filter(
        (item) => item.status?.toLowerCase() === "rejected"
      ).length,
    };
  }, [data, leaves]);

  const hasFilters =
    Boolean(debouncedSearch) ||
    Boolean(leaveTypeFilter) ||
    Boolean(statusFilter);

  const clearFilters = () => {
    setSearch("");
    setLeaveTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const handleLeaveTypeChange = (event) => {
    setLeaveTypeFilter(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* PAGE HEADER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 10h18" />
                <path d="M8 14h2M14 14h2M8 18h2" />
              </svg>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Leave Management
                </h1>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {stats.total} Records
                </span>
              </div>

              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Manage employee leave requests, track approval status and
                maintain leave history.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TableToolbar
              onRefresh={refetch}
              refreshing={isFetching}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              exporting={exporting}
            />

            {isAdmin && (
              <Link to="/leaves/approvals">
                <Button variant="secondary">
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m9 11 3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Approvals
                  </span>
                </Button>
              </Link>
            )}

            <Link to="/leaves/new">
              <Button>
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Request Leave
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          description="All leave records"
          type="total"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          description="Pending on current page"
          type="pending"
        />

        <StatCard
          title="Approved"
          value={stats.approved}
          description="Approved on current page"
          type="approved"
        />

        <StatCard
          title="Rejected"
          value={stats.rejected}
          description="Rejected on current page"
          type="rejected"
        />
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {/* FILTER HEADER */}
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 dark:border-slate-700 dark:bg-slate-800/70 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Leave Requests
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Search, filter and review employee leave requests.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-center">
              <TableSearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search employee, reason..."
                className="sm:w-64"
              />

              <Select
                value={leaveTypeFilter}
                onChange={handleLeaveTypeChange}
                placeholder="All leave types"
                options={(leaveTypes?.items || []).map((lt) => ({
                  value: lt.id,
                  label: lt.name,
                }))}
                disabled={loadingLeaveTypes}
                className="sm:w-52"
              />

              <Select
                value={statusFilter}
                onChange={handleStatusChange}
                placeholder="All statuses"
                options={[
                  { value: "Pending", label: "Pending" },
                  { value: "Approved", label: "Approved" },
                  { value: "Rejected", label: "Rejected" },
                ]}
                className="sm:w-44"
              />

              {hasFilters && (
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Filters:
              </span>

              {debouncedSearch && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                  Search: {debouncedSearch}
                </span>
              )}

              {leaveTypeFilter && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                  Leave Type:{" "}
                  {leaveTypes?.items?.find(
                    (item) =>
                      String(item.id) === String(leaveTypeFilter)
                  )?.name || leaveTypeFilter}
                </span>
              )}

              {statusFilter && (
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                  Status: {statusFilter}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ERROR */}
        {isError && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Unable to load leave requests
                </p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/70">
                  Please try again.
                </p>
              </div>

              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* FETCHING INDICATOR */}
        <div className="relative">
          {isFetching && !isLoading && (
            <div className="absolute right-5 top-4 z-10">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary-500" />
                Updating
              </div>
            </div>
          )}

          <LeaveTable
            data={leaves}
            loading={isLoading}
            isAdmin={isAdmin}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        </div>

        {/* PAGINATION */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50 sm:px-6">
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
    </div>
  );
}