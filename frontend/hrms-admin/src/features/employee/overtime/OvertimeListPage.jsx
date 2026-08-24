import GenericListPage from "@/components/table/GenericListPage";
import OvertimeForm from "./OvertimeForm";

import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useOvertime,
  useCreateOvertime,
  useDeactivateOvertime,
} from "./useOvertime";

import { formatDate } from "@/utils/formatDate";

/* ============================================================
   STATUS HELPERS
============================================================ */

const getStatusStyles = (status) => {
  const normalized = String(
    status || "Pending"
  ).toLowerCase();

  const styles = {
    pending:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",

    approved:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",

    rejected:
      "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-300",

    completed:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",

    cancelled:
      "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300",
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
      {/* Employee Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
        {initials}
      </div>

      {/* Employee Details */}
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
        Overtime date
      </p>
    </div>
  );
};

/* ============================================================
   HOURS CELL
============================================================ */

const HoursCell = ({ value }) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return (
      <span className="text-sm text-slate-400 dark:text-slate-500">
        -
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[70px] items-center justify-center rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-primary-600/20 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-500/20">
      {value} {Number(value) === 1 ? "hour" : "hours"}
    </span>
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
  /* ----------------------------------------------------------
     EMPLOYEE
  ---------------------------------------------------------- */

  {
    key: "employee_id",
    label: "Employee",
    sortable: true,

    render: (row) => (
      <EmployeeCell row={row} />
    ),
  },

  /* ----------------------------------------------------------
     DATE
  ---------------------------------------------------------- */

  {
    key: "overtime_date",
    label: "Overtime Date",
    sortable: true,

    render: (row) => (
      <DateCell value={row.overtime_date} />
    ),
  },

  /* ----------------------------------------------------------
     HOURS
  ---------------------------------------------------------- */

  {
    key: "hours",
    label: "Hours",
    sortable: true,

    render: (row) => (
      <HoursCell value={row.hours} />
    ),
  },

  /* ----------------------------------------------------------
     STATUS
  ---------------------------------------------------------- */

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

export default function OvertimeListPage() {
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

        {/* Header content */}
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
            {/* Overtime icon */}
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
                {/* Clock */}
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                />

                {/* Clock hands */}
                <path d="M12 8v4l2.5 2" />

                {/* Small overtime indicator */}
                <path d="M19 5l1.5-1.5" />

                <path d="M5 5L3.5 3.5" />
              </svg>
            </div>

            {/* Heading */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white">
                  Overtime
                </h1>

                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  Employee Lifecycle
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage employee overtime records,
                hours and approval status
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
            module="Overtime"
            title="Overtime Records"
            subtitle="Track employee overtime hours and approval status"
            columns={COLUMNS}
            api={employeeLifecycleApi.overtime}
            useList={useOvertime}
            useCreate={useCreateOvertime}
            useRemove={useDeactivateOvertime}
            filename="overtime"
            searchPlaceholder="Search employee, date or status..."
            FormComponent={OvertimeForm}
            formTitle="Overtime Record"
            addLabel="Add Overtime"
            actionsMode="none"
            entityLabel="Overtime record"
          />
        </div>
      </section>
    </div>
  );
}