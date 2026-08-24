import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useLeaveApprovals } from "./useLeaveApprovals";
import DataTable from "@/components/table/DataTable";
import LeaveStatusBadge from "./components/LeaveStatusBadge";

import { usePagination } from "@/hooks/usePagination";
import { useTableExport } from "@/hooks/useTableExport";

import TablePagination from "@/components/table/TablePagination";
import TableToolbar from "@/components/table/TableToolbar";

import Button from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";

import { formatDate } from "@/utils/formatDate";
import { leavesApi } from "@/api/leaves.api";

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

function EmployeeCell({ employee }) {
  if (!employee) {
    return (
      <span className="text-sm text-slate-400 dark:text-slate-500">
        Unknown employee
      </span>
    );
  }

  const name =
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

  const initials =
    `${employee.first_name?.charAt(0) || ""}${
      employee.last_name?.charAt(0) || ""
    }`.toUpperCase();

  return (
    <div className="flex min-w-[190px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
        {initials || "?"}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {name || "-"}
        </p>

        {employee.employee_code && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {employee.employee_code}
          </p>
        )}
      </div>
    </div>
  );
}

function DaysCell({ days }) {
  const isLongLeave = Number(days) >= 5;

  return (
    <div
      className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-bold ${
        isLongLeave
          ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
          : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
      }`}
    >
      {days} {Number(days) === 1 ? "Day" : "Days"}
    </div>
  );
}

export default function LeaveApprovalsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    params,
    page,
    perPage,
    setPage,
    setPerPage,
  } = usePagination();

  const queryParams = {
    ...params,
    search: "Pending",
  };

  const { leaves, approve, reject } =
    useLeaveApprovals(queryParams);

  const { exporting, exportExcel, exportPDF } = useTableExport({
    fetchAll: leavesApi.list,
    queryParams,
    exportColumns: EXPORT_COLUMNS,
    filename: "leave-approvals",
    title: "Pending Leave Approvals",
  });

  const pendingLeaves = leaves.data?.items || [];

  const totalPendingDays = useMemo(
    () =>
      pendingLeaves.reduce(
        (sum, leave) => sum + Number(leave.total_days || 0),
        0
      ),
    [pendingLeaves]
  );

  const handleApprove = async (id) => {
    try {
      await approve.mutateAsync(id);

      showToast("Leave approved successfully", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to approve leave",
        "error"
      );
    }
  };

  const handleReject = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this leave request?"
    );

    if (!confirmed) return;

    try {
      await reject.mutateAsync(id);

      showToast("Leave rejected successfully", "success");
    } catch (error) {
      showToast(
        error.response?.data?.message || "Failed to reject leave",
        "error"
      );
    }
  };

  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (row) => (
        <EmployeeCell employee={row.employee} />
      ),
    },

    {
      key: "leave_type",
      label: "Leave Type",
      render: (row) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {row.leave_type?.name || "-"}
        </span>
      ),
    },

    {
      key: "from_date",
      label: "Leave Period",
      render: (row) => (
        <div className="min-w-[160px]">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <span>{formatDate(row.from_date)}</span>

            <svg
              className="h-3.5 w-3.5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>

            <span>{formatDate(row.to_date)}</span>
          </div>
        </div>
      ),
    },

    {
      key: "total_days",
      label: "Duration",
      render: (row) => (
        <DaysCell days={row.total_days} />
      ),
    },

    {
      key: "reason",
      label: "Reason",
      render: (row) => (
        <p
          className="max-w-[250px] truncate text-sm text-slate-600 dark:text-slate-300"
          title={row.reason || ""}
        >
          {row.reason || "No reason provided"}
        </p>
      ),
    },

    {
      key: "status",
      label: "Status",
      render: (row) => (
        <LeaveStatusBadge status={row.status} />
      ),
    },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApprove(row.id)}
            isLoading={
              approve.isPending &&
              approve.variables === row.id
            }
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
              Approve
            </span>
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => handleReject(row.id)}
            isLoading={
              reject.isPending &&
              reject.variables === row.id
            }
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
              Reject
            </span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-900/10 dark:to-slate-800 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Leave Approvals
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review and process employee leave requests waiting for
                approval.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TableToolbar
              onRefresh={leaves.refetch}
              refreshing={leaves.isFetching}
              onExportExcel={exportExcel}
              onExportPDF={exportPDF}
              exporting={exporting}
            />

            <Button
              variant="secondary"
              onClick={() => navigate("/leaves")}
            >
              Back to Leaves
            </Button>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-900/40 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Pending Requests
          </p>

          <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
            {leaves.data?.total || 0}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Requests requiring admin action
          </p>
        </div>

        <div className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm dark:border-primary-900/40 dark:bg-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Pending Leave Days
          </p>

          <p className="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
            {totalPendingDays}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across requests on the current page
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-5 dark:border-slate-700 dark:bg-slate-800/70 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Requests Awaiting Approval
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Approve or reject pending employee leave requests.
          </p>
        </div>

        <DataTable
          columns={columns}
          data={pendingLeaves}
          loading={leaves.isLoading}
        />

        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50 sm:px-6">
          <TablePagination
            page={page}
            pages={leaves.data?.pages || 1}
            total={leaves.data?.total || 0}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </div>
      </div>
    </div>
  );
}