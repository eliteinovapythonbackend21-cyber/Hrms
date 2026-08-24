import { Link } from "react-router-dom";

import DataTable from "@/components/table/DataTable";
import LeaveStatusBadge from "./LeaveStatusBadge";
import { formatDate } from "@/utils/formatDate";

function getInitials(employee) {
  if (!employee) return "?";

  const first = employee.first_name?.charAt(0) || "";
  const last = employee.last_name?.charAt(0) || "";

  return `${first}${last}`.toUpperCase() || "?";
}

function EmployeeCell({ employee }) {
  if (!employee) {
    return (
      <div className="text-sm text-slate-400 dark:text-slate-500">
        Employee unavailable
      </div>
    );
  }

  const fullName =
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

  return (
    <div className="flex min-w-[190px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
        {getInitials(employee)}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {fullName || "-"}
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

function LeavePeriod({ row }) {
  return (
    <div className="min-w-[155px]">
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

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Leave period
      </p>
    </div>
  );
}

function ReasonCell({ reason }) {
  if (!reason) {
    return (
      <span className="text-sm text-slate-400 dark:text-slate-500">
        No reason provided
      </span>
    );
  }

  return (
    <div className="max-w-[260px]">
      <p
        className="truncate text-sm text-slate-600 dark:text-slate-300"
        title={reason}
      >
        {reason}
      </p>
    </div>
  );
}

function DaysBadge({ days }) {
  return (
    <div className="inline-flex min-w-[70px] items-center justify-center rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-700">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
        {days || 0}
      </span>

      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
        {Number(days) === 1 ? "day" : "days"}
      </span>
    </div>
  );
}

export default function LeaveTable({
  data,
  loading,
  isAdmin,
  sortBy,
  sortDir,
  onSort,
}) {
  const columns = [
    {
      key: "employee",
      label: "Employee",
      render: (row) => <EmployeeCell employee={row.employee} />,
    },

    {
      key: "leave_type",
      label: "Leave Type",
      render: (row) => (
        <div className="min-w-[130px]">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {row.leave_type?.name || "-"}
          </span>
        </div>
      ),
    },

    {
      key: "from_date",
      label: "Leave Period",
      sortable: true,
      render: (row) => <LeavePeriod row={row} />,
    },

    {
      key: "total_days",
      label: "Duration",
      sortable: true,
      render: (row) => <DaysBadge days={row.total_days} />,
    },

    {
      key: "reason",
      label: "Reason",
      render: (row) => <ReasonCell reason={row.reason} />,
    },

    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (row) => <LeaveStatusBadge status={row.status} />,
    },

    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        isAdmin && row.status?.toLowerCase() === "pending" ? (
          <Link
            to="/leaves/approvals"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/40"
          >
            Review

            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            —
          </span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
    />
  );
}