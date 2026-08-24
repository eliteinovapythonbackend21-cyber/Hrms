import GenericListPage from "@/components/table/GenericListPage";
import TrainingProgramForm from "./TrainingProgramForm";

import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useTrainingPrograms,
  useCreateTrainingProgram,
  useDeactivateTrainingProgram,
} from "./useTrainingPrograms";

import { formatDate } from "@/utils/formatDate";

/* ============================================================
   STATUS HELPER
============================================================ */

const getStatusStyles = (status) => {
  const normalizedStatus = String(
    status || "Scheduled"
  ).toLowerCase();

  const styles = {
    scheduled:
      "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300",

    ongoing:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",

    completed:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  };

  return (
    styles[normalizedStatus] ||
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
    <div className="flex min-w-[210px] items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
        {initials}
      </div>

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

const DateCell = ({ value, label }) => (
  <div className="min-w-[125px]">
    <p className="whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">
      {value ? formatDate(value) : "-"}
    </p>

    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
      {label}
    </p>
  </div>
);

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
    key: "program_name",
    label: "Training Program",
    sortable: true,

    render: (row) => (
      <div className="min-w-[200px]">
        <p className="font-semibold text-slate-900 dark:text-white">
          {row.program_name || "-"}
        </p>

        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Employee Development
        </p>
      </div>
    ),
  },

  {
    key: "start_date",
    label: "Start Date",
    sortable: true,

    render: (row) => (
      <DateCell
        value={row.start_date}
        label="Training start"
      />
    ),
  },

  {
    key: "end_date",
    label: "End Date",
    sortable: true,

    render: (row) => (
      <DateCell
        value={row.end_date}
        label="Training end"
      />
    ),
  },

  {
    key: "status",
    label: "Status",
    sortable: true,

    render: (row) => {
      const status =
        row.status || "Scheduled";

      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyles(
            status
          )}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />

          {status}
        </span>
      );
    },
  },
];

/* ============================================================
   PAGE
============================================================ */

export default function TrainingProgramListPage() {
  return (
    <div className="min-h-full w-full space-y-6">
      {/* ======================================================
          PAGE INTRO CARD
      ======================================================= */}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                <path d="M8 6h8" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
              </svg>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Training Programs
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage employee training and development
                programs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          TRAINING HIGHLIGHT CARDS
      ======================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TrainingMetric
          label="Training"
          description="Employee development programs"
          icon="training"
        />

        <TrainingMetric
          label="Scheduled"
          description="Upcoming training programs"
          icon="scheduled"
        />

        <TrainingMetric
          label="Ongoing"
          description="Currently active training"
          icon="ongoing"
        />

        <TrainingMetric
          label="Completed"
          description="Successfully completed"
          icon="completed"
        />
      </div>

      {/* ======================================================
          MAIN LIST CARD
      ======================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <GenericListPage
          module="Training"
          title="Training Programs"
          subtitle="Track employee training schedules, progress and completion"
          columns={COLUMNS}
          api={employeeLifecycleApi.training}
          useList={useTrainingPrograms}
          useCreate={useCreateTrainingProgram}
          useRemove={useDeactivateTrainingProgram}
          filename="training"
          searchPlaceholder="Search employee, training program or status..."
          FormComponent={TrainingProgramForm}
          formTitle="Training Program"
          addLabel="Add Training"
          actionsMode="none"
          entityLabel="Training record"
        />
      </div>
    </div>
  );
}

/* ============================================================
   TRAINING METRIC
============================================================ */

function TrainingMetric({
  label,
  description,
  icon,
}) {
  const styles = {
    training:
      "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",

    scheduled:
      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",

    ongoing:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",

    completed:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  const icons = {
    training: "T",
    scheduled: "◷",
    ongoing: "●",
    completed: "✓",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${styles[icon]}`}
        >
          {icons[icon]}
        </div>
      </div>
    </div>
  );
}