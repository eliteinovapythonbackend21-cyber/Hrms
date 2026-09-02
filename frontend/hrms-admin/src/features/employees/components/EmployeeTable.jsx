import { useState } from "react";
import { Link } from "react-router-dom";

import DataTable from "@/components/table/DataTable";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/utils/formatCurrency";

// Attendance / Leave quick-view popups
import { useAttendance } from "@/features/attendance/useAttendance";
import AttendanceTable from "@/features/attendance/components/AttendanceTable";

import { useLeaves } from "@/features/leaves/useLeaves";
import LeaveTable from "@/features/leaves/components/LeaveTable";

/* =========================================================
   ICONS
========================================================= */

const Icon = ({
  children,
  className = "h-4 w-4",
}) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    className={className}
  >
    {children}
  </svg>
);

const EyeIcon = () => (
  <Icon>
    <path
      d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle
      cx="10"
      cy="10"
      r="2.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
  </Icon>
);

const AttendanceIcon = () => (
  <Icon>
    <circle
      cx="10"
      cy="10.5"
      r="6.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M10 7v3.5l2.3 1.3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 2h6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </Icon>
);

const LeaveIcon = () => (
  <Icon>
    <rect
      x="3"
      y="4.5"
      width="14"
      height="12"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M3 8h14M7 3v3M13 3v3"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M7.5 12.5l2 2 3-3.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Icon>
);

/* =========================================================
   ICON ACTION
========================================================= */

const ICON_ACTION_TONES = {
  primary:
    "text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-500/10",
  blue:
    "text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-500/10",
  violet:
    "text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-400 dark:hover:bg-violet-500/10",
};

function IconAction({
  icon,
  label,
  onClick,
  to,
  tone = "primary",
}) {
  const className = `inline-flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:shadow-sm ${
    ICON_ACTION_TONES[tone] || ICON_ACTION_TONES.primary
  }`;

  if (to) {
    return (
      <Link
        to={to}
        title={label}
        aria-label={label}
        className={className}
      >
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={className}
    >
      {icon}
    </button>
  );
}

/* =========================================================
   NAVIGATION HELPERS
========================================================= */

/*
 * Determines where the EmployeeTable is currently being
 * rendered from.
 *
 * /master/employees -> master
 * /crm/employees    -> crm
 * /employees        -> normal
 */
function getEmployeeSource() {
  const pathname = window.location.pathname;

  if (
    pathname.startsWith(
      "/master/employees"
    )
  ) {
    return "master";
  }

  if (
    pathname.startsWith(
      "/crm/employees"
    )
  ) {
    return "crm";
  }

  return "employees";
}

/*
 * Salary URL.
 *
 * We deliberately preserve the source with a query parameter
 * because the Salary page is a separate route:
 *
 * /employees/:id/salary
 *
 * The Salary page reads ?from=master / ?from=crm.
 */
function getSalaryPath(employeeId) {
  const source =
    getEmployeeSource();

  if (source === "master") {
    return `/employees/${employeeId}/salary?from=master`;
  }

  if (source === "crm") {
    return `/employees/${employeeId}/salary?from=crm`;
  }

  return `/employees/${employeeId}/salary`;
}

/*
 * Payslip follows the same navigation pattern as Salary.
 */
function getPayslipPath(employeeId) {
  const source =
    getEmployeeSource();

  if (source === "master") {
    return `/employees/${employeeId}/payslip?from=master`;
  }

  if (source === "crm") {
    return `/employees/${employeeId}/payslip?from=crm`;
  }

  return `/employees/${employeeId}/payslip`;
}

/* =========================================================
   EMPLOYEE NAME
========================================================= */

function getEmployeeName(employee) {
  return `${employee?.first_name || ""} ${
    employee?.last_name || ""
  }`.trim();
}

/* =========================================================
   EMPLOYEE TABLE
========================================================= */

export default function EmployeeTable({
  data,
  loading,
  sortBy,
  sortDir,
  onSort,
  restricted = false,
}) {
  /*
   * {
   *   type: "attendance" | "leave",
   *   employee
   * }
   */
  const [
    modalState,
    setModalState,
  ] = useState(null);

  const attendanceModalOpen =
    modalState?.type ===
    "attendance";

  const leaveModalOpen =
    modalState?.type === "leave";

  /* =======================================================
     ATTENDANCE
  ======================================================= */

  const {
    data: attendanceData,
    isLoading:
      attendanceLoading,
  } = useAttendance(
    {
      employee_id:
        modalState?.employee?.id,
    },
    {
      enabled:
        attendanceModalOpen,
    }
  );

  /* =======================================================
     LEAVES
  ======================================================= */

  const {
    data: leaveData,
    isLoading: leaveLoading,
  } = useLeaves(
    {
      per_page: 1000,
    },
    {
      enabled:
        leaveModalOpen,
    }
  );

  const employeeLeaves =
    (leaveData?.items || []).filter(
      (leave) =>
        leave.employee_id ===
          modalState?.employee?.id ||
        leave.employee?.id ===
          modalState?.employee?.id
    );

  const closeModal = () => {
    setModalState(null);
  };

  /* =======================================================
     COLUMNS
  ======================================================= */

  const columns = [
    /* -------------------------------------------------------
       CODE
    ------------------------------------------------------- */

    {
      key: "employee_code",
      label: "Code",
      sortable: true,

      render: (employee) => (
        <span className="tbl-code">
          {employee.employee_code || "—"}
        </span>
      ),
    },

    /* -------------------------------------------------------
       NAME
    ------------------------------------------------------- */

    {
      key: "first_name",
      label: "Name",
      sortable: true,

      render: (employee) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {getEmployeeName(
            employee
          )}
        </span>
      ),
    },

    /* -------------------------------------------------------
       COMPANY / BRANCH
    ------------------------------------------------------- */

    {
      key: "company_branch",
      label:
        "Company / Branch",

      render: (employee) => (
        <div className="flex min-w-0 items-start gap-2 text-xs leading-tight">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-700 dark:text-slate-200">
              {employee.department
                ?.company?.name ||
                "-"}
            </p>

            <p className="truncate text-slate-400 dark:text-slate-500">
              {employee.department
                ?.branch?.name ||
                "-"}
            </p>
          </div>
        </div>
      ),
    },

    /* -------------------------------------------------------
       DEPARTMENT / DESIGNATION
    ------------------------------------------------------- */

    {
      key: "department_designation",
      label:
        "Department / Designation",

      render: (employee) => (
        <div className="flex min-w-0 items-start gap-2 text-xs leading-tight">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-700 dark:text-slate-200">
              {employee.department
                ?.department_name ||
                "-"}
            </p>

            <p className="truncate text-slate-400 dark:text-slate-500">
              {employee.designation
                ?.designation_name ||
                "-"}
            </p>
          </div>
        </div>
      ),
    },

    /* -------------------------------------------------------
       SALARY
       Hidden on restricted Employees page.
    ------------------------------------------------------- */

    ...(!restricted
      ? [
          {
            key: "salary",
            label: "Salary",
            sortable: true,

            render: (employee) => (
              <span className="whitespace-nowrap text-xs">
                {formatCurrency(
                  employee.salary
                )}
              </span>
            ),
          },
        ]
      : []),

    /* -------------------------------------------------------
       STATUS
    ------------------------------------------------------- */

    {
      key: "is_active",
      label: "Status",
      sortable: true,

      render: (employee) => (
        <span
          className={`pill ${
            employee.is_active
              ? "pill-success"
              : "pill-danger"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              employee.is_active
                ? "bg-emerald-500 u-pulse"
                : "bg-rose-500"
            }`}
          />
          {employee.is_active
            ? "Active"
            : "Inactive"}
        </span>
      ),
    },

    /* -------------------------------------------------------
       ATTENDANCE / LEAVES
       Restricted view only.
    ------------------------------------------------------- */

    ...(restricted
      ? [
          {
            key: "attendance_popup",
            label: "Attendance",

            render: (employee) => (
              <IconAction
                icon={
                  <AttendanceIcon />
                }
                label="View attendance"
                tone="blue"
                onClick={() =>
                  setModalState({
                    type: "attendance",
                    employee,
                  })
                }
              />
            ),
          },

          {
            key: "leave_popup",
            label: "Leaves",

            render: (employee) => (
              <IconAction
                icon={
                  <LeaveIcon />
                }
                label="View leaves"
                tone="violet"
                onClick={() =>
                  setModalState({
                    type: "leave",
                    employee,
                  })
                }
              />
            ),
          },
        ]
      : []),

    /* -------------------------------------------------------
       ACTIONS
    ------------------------------------------------------- */

    {
      key: "actions",
      label: "Actions",

      render: (employee) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {/* =================================================
             VIEW
          ================================================= */}

          {restricted ? (
            <IconAction
              icon={<EyeIcon />}
              label="View employee"
              to={`/employees/${employee.id}?restricted=1`}
            />
          ) : (
            <Link
              to={`/employees/${employee.id}`}
              className="rounded-md bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-primary-500/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-100 hover:shadow-sm dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20 dark:hover:bg-primary-500/20"
            >
              View
            </Link>
          )}

          {/* =================================================
             SALARY + PAYSLIP
             Hidden on restricted Employee page.
          ================================================= */}

          {!restricted && (
            <>
              <Link
                to={getSalaryPath(
                  employee.id
                )}
                className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-sm dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20 dark:hover:bg-emerald-500/20"
              >
                Salary
              </Link>

              <Link
                to={getPayslipPath(
                  employee.id
                )}
                className="rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-500/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-100 hover:shadow-sm dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20 dark:hover:bg-violet-500/20"
              >
                Payslip
              </Link>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={onSort}
      />

      {/* =====================================================
          ATTENDANCE / LEAVES POPUPS
      ===================================================== */}

      {restricted && (
        <>
          <Modal
            open={
              attendanceModalOpen
            }
            onClose={closeModal}
            title={`Attendance — ${getEmployeeName(
              modalState?.employee
            )}`}
            size="xl"
          >
            <AttendanceTable
              data={
                attendanceData?.items ||
                []
              }
              loading={
                attendanceLoading
              }
              sortBy={undefined}
              sortDir={undefined}
              onSort={() => {}}
            />
          </Modal>

          <Modal
            open={leaveModalOpen}
            onClose={closeModal}
            title={`Leaves — ${getEmployeeName(
              modalState?.employee
            )}`}
            size="xl"
          >
            <LeaveTable
              data={employeeLeaves}
              loading={leaveLoading}
              isAdmin={false}
              sortBy={undefined}
              sortDir={undefined}
              onSort={() => {}}
            />
          </Modal>
        </>
      )}
    </>
  );
}