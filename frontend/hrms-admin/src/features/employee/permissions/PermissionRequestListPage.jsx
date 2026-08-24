import GenericListPage from "@/components/table/GenericListPage";
import PermissionRequestForm from "./PermissionRequestForm";

import { employeeLifecycleApi } from "@/api/employee.api";

import {
  usePermissionRequests,
  useCreatePermissionRequest,
  useDeactivatePermissionRequest,
} from "./usePermissionRequests";

import { formatDate } from "@/utils/formatDate";

/* ============================================================
   STATUS HELPERS
============================================================ */

const getStatus = (row) =>
  String(row?.status || "Pending").toLowerCase();

const getStatusStyles = (status) => {
  const normalized = String(status || "Pending").toLowerCase();

  const styles = {
    pending:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",

    approved:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",

    rejected:
      "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300",
  };

  return (
    styles[normalized] ||
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300"
  );
};

/* ============================================================
   EMPLOYEE CELL
============================================================ */

const EmployeeCell = ({ row }) => {
  const employee = row?.employee;

  const employeeName = employee
    ? `${employee.first_name || ""} ${
        employee.last_name || ""
      }`.trim()
    : row?.employee_name || null;

  const employeeCode =
    employee?.employee_code ||
    row?.employee_code ||
    (row?.employee_id
      ? `ID: ${row.employee_id}`
      : "-");

  const initials =
    employeeName
      ?.split(" ")
      .filter(Boolean)
      .map((name) => name.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "E";

  return (
    <div className="flex w-[220px] items-center gap-3">
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
        {initials}
      </div>

      {/* Employee information */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
          {employeeName || "-"}
        </p>

        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {employeeCode}
        </p>
      </div>
    </div>
  );
};

/* ============================================================
   DATE CELL
============================================================ */

const DateCell = ({ value }) => {
  return (
    <div className="w-[140px]">
      <p className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
        {value ? formatDate(value) : "-"}
      </p>

      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        Permission day
      </p>
    </div>
  );
};

/* ============================================================
   TIME CELL
============================================================ */

const TimeCell = ({ value }) => {
  if (!value) {
    return (
      <span className="text-sm text-slate-400 dark:text-slate-500">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap items-center rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
      {value}
    </span>
  );
};

/* ============================================================
   REASON CELL
============================================================ */

const ReasonCell = ({ value }) => {
  const reason = value || "-";

  return (
    <div className="w-[240px]">
      <p
        title={reason}
        className="truncate text-sm text-slate-600 dark:text-slate-300"
      >
        {reason}
      </p>
    </div>
  );
};

/* ============================================================
   STATUS CELL
============================================================ */

const StatusCell = ({ value }) => {
  const status = value || "Pending";

  return (
    <span
      className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyles(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {status}
    </span>
  );
};

/* ============================================================
   TABLE COLUMNS
============================================================ */

const COLUMNS = [
  {
    key: "employee_id",
    label: "Employee",
    sortable: true,
    render: (row) => (
      <EmployeeCell row={row} />
    ),
  },

  {
    key: "permission_date",
    label: "Permission Date",
    sortable: true,
    render: (row) => (
      <DateCell value={row.permission_date} />
    ),
  },

  {
    key: "from_time",
    label: "From",
    sortable: true,
    render: (row) => (
      <TimeCell value={row.from_time} />
    ),
  },

  {
    key: "to_time",
    label: "To",
    sortable: true,
    render: (row) => (
      <TimeCell value={row.to_time} />
    ),
  },

  {
    key: "reason",
    label: "Reason",
    sortable: false,
    render: (row) => (
      <ReasonCell value={row.reason} />
    ),
  },

  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (row) => (
      <StatusCell value={row.status} />
    ),
  },
];

/* ============================================================
   PAGE
============================================================ */

export default function PermissionRequestListPage() {
  return (
    <div
      className="
        w-full
        min-w-0
        space-y-6
        overflow-visible
      "
      style={{
        overflowY: "visible",
        maxHeight: "none",
      }}
    >
      {/* ======================================================
          PAGE HEADER CARD
      ======================================================= */}

      <section
        className="
          relative
          w-full
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
        "
      >
        {/* Decorative background */}
        <div
          className="
            pointer-events-none
            absolute
            -right-16
            -top-16
            h-48
            w-48
            rounded-full
            bg-primary-500/5
            blur-3xl
          "
        />

        <div
          className="
            relative
            flex
            w-full
            items-center
            justify-between
            gap-5
            px-6
            py-6
          "
        >
          {/* Left section */}
          <div className="flex min-w-0 items-center gap-4">
            {/* Icon */}
            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-primary-50
                text-primary-600
                dark:bg-primary-500/10
                dark:text-primary-400
              "
            >
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M7 3h10" />

                <path d="M7 3v4h10V3" />

                <rect
                  x="4"
                  y="7"
                  width="16"
                  height="14"
                  rx="2"
                />

                <path d="M8 11h8" />

                <path d="M8 15h5" />
              </svg>
            </div>

            {/* Heading */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">
                  Short Leave / Gate Pass
                </h1>

                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  Permissions
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage employee permission requests,
                short leaves and gate passes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          MAIN LIST CARD
      ======================================================= */}

      <section
        className="
          w-full
          min-w-0
          overflow-visible
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-900
        "
        style={{
          overflowY: "visible",
          maxHeight: "none",
        }}
      >
        <div
          className="
            w-full
            min-w-0
            overflow-visible
          "
          style={{
            overflowY: "visible",
            maxHeight: "none",
          }}
        >
          <GenericListPage
            module="Employee Permissions"
            title="Permission Requests"
            subtitle="Track employee permission requests and approval status"
            columns={COLUMNS}
            api={employeeLifecycleApi.permissions}
            useList={usePermissionRequests}
            useCreate={useCreatePermissionRequest}
            useRemove={useDeactivatePermissionRequest}
            filename="employee-permissions"
            searchPlaceholder="Search employee, reason or status..."
            FormComponent={PermissionRequestForm}
            formTitle="Permission Request"
            addLabel="Add Request"
            actionsMode="none"
            entityLabel="Permission request"
          />
        </div>
      </section>
    </div>
  );
}