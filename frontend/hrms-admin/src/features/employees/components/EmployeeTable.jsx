import { useState } from "react";
import { Link } from "react-router-dom";

import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
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

function IconAction({
  icon,
  label,
  onClick,
  to,
}) {
  const className =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-primary-50 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-400";

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
    },

    /* -------------------------------------------------------
       NAME
    ------------------------------------------------------- */

    {
      key: "first_name",
      label: "Name",
      sortable: true,

      render: (employee) => (
        <span className="text-sm">
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
        <div className="min-w-0 text-xs leading-tight">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {employee.department
              ?.company?.name ||
              "-"}
          </p>

          <p className="truncate text-slate-400">
            {employee.department
              ?.branch?.name ||
              "-"}
          </p>
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
        <div className="min-w-0 text-xs leading-tight">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {employee.department
              ?.department_name ||
              "-"}
          </p>

          <p className="truncate text-slate-400">
            {employee.designation
              ?.designation_name ||
              "-"}
          </p>
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
        <Badge
          className={`text-xs ${
            employee.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }`}
        >
          {employee.is_active
            ? "Active"
            : "Inactive"}
        </Badge>
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
        <div className="flex items-center gap-2 whitespace-nowrap">
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
              className="text-xs text-primary-600 hover:underline"
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
                className="text-xs text-primary-600 hover:underline"
              >
                Salary
              </Link>

              <Link
                to={getPayslipPath(
                  employee.id
                )}
                className="text-xs text-primary-600 hover:underline"
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