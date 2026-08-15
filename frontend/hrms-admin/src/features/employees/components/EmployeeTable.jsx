import { useState } from "react";
import { Link } from "react-router-dom";
import DataTable from "@/components/table/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/utils/formatCurrency";

// New: per-row Attendance / Leaves quick-view, opened in a popup instead
// of navigating away.
import { useAttendance } from "@/features/attendance/useAttendance";
import AttendanceTable from "@/features/attendance/components/AttendanceTable";
import { useLeaves } from "@/features/leaves/useLeaves";
import LeaveTable from "@/features/leaves/components/LeaveTable";

// Small icon-only action controls, styled the same way as the icons in
// EmployeeDetailPage.jsx (stroke-based, currentColor, 20x20 viewBox) —
// kept local to this file since they're only used here.
const Icon = ({ children, className = "h-4 w-4" }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    {children}
  </svg>
);

const EyeIcon = () => (
  <Icon>
    <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3" />
  </Icon>
);

const AttendanceIcon = () => (
  <Icon>
    <circle cx="10" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M10 7v3.5l2.3 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 2h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Icon>
);

const LeaveIcon = () => (
  <Icon>
    <rect x="3" y="4.5" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M7.5 12.5l2 2 3-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

// Icon button wrapper — consistent hit target + hover state for all
// icon-only actions in this table.
function IconAction({ icon, label, onClick, to }) {
  const className =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-primary-50 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-400";

  if (to) {
    return (
      <Link to={to} title={label} aria-label={label} className={className}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      {icon}
    </button>
  );
}

// Employees is view-mostly: View, Salary, Payslip only. No Edit/Deactivate
// anywhere — not gated by the permission matrix, removed entirely (matches
// the Leaves list's add-only-without-delete treatment).
//
// Column count kept tight on purpose: Company/Branch and Department/
// Designation are each merged into one stacked two-line cell instead of
// four separate columns, and custom cell text runs smaller (text-xs) —
// keeps the whole table inside the card width without a horizontal
// scrollbar on typical desktop widths.
export default function EmployeeTable({ data, loading, sortBy, sortDir, onSort, restricted = false }) {
  // { type: "attendance" | "leave", employee } | null
  const [modalState, setModalState] = useState(null);

  const attendanceModalOpen = modalState?.type === "attendance";
  const leaveModalOpen = modalState?.type === "leave";

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendance(
    { employee_id: modalState?.employee?.id },
    { enabled: attendanceModalOpen }
  );

  const { data: leaveData, isLoading: leaveLoading } = useLeaves(
    // The /leaves/ backend endpoint only supports `search` and `leave_type`
    // filters (see LeaveApprovalsPage.jsx) — no employee_id. So we fetch a
    // large unfiltered batch here and filter to this employee client-side
    // below, instead of relying on a server-side filter that doesn't exist.
    { per_page: 1000 },
    { enabled: leaveModalOpen }
  );

  const employeeLeaves = (leaveData?.items || []).filter(
    (l) => l.employee_id === modalState?.employee?.id || l.employee?.id === modalState?.employee?.id
  );

  const closeModal = () => setModalState(null);

  const employeeName = (r) => `${r?.first_name || ""} ${r?.last_name || ""}`.trim();

  const columns = [
    { key: "employee_code", label: "Code", sortable: true },
    {
      key: "first_name",
      label: "Name",
      sortable: true,
      render: (r) => (
        <span className="text-sm">
          {`${r.first_name || ""} ${r.last_name || ""}`.trim()}
        </span>
      ),
    },
    {
      key: "company_branch",
      label: "Company / Branch",
      render: (r) => (
        <div className="min-w-0 text-xs leading-tight">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {r.department?.company?.name || "-"}
          </p>
          <p className="truncate text-slate-400">
            {r.department?.branch?.name || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "department_designation",
      label: "Department / Designation",
      render: (r) => (
        <div className="min-w-0 text-xs leading-tight">
          <p className="truncate font-medium text-slate-700 dark:text-slate-200">
            {r.department?.department_name || "-"}
          </p>
          <p className="truncate text-slate-400">
            {r.designation?.designation_name || "-"}
          </p>
        </div>
      ),
    },
    // Salary column: hidden entirely on the restricted (/employees) view
    ...(!restricted
      ? [
          {
            key: "salary",
            label: "Salary",
            sortable: true,
            render: (r) => (
              <span className="whitespace-nowrap text-xs">
                {formatCurrency(r.salary)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "is_active",
      label: "Status",
      sortable: true,
      render: (r) => (
        <Badge
          className={`text-xs ${
            r.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          }`}
        >
          {r.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    // Attendance / Leaves columns: dedicated columns, restricted (/employees) view only
    ...(restricted
      ? [
          {
            key: "attendance_popup",
            label: "Attendance",
            render: (r) => (
              <IconAction
                icon={<AttendanceIcon />}
                label="View attendance"
                onClick={() => setModalState({ type: "attendance", employee: r })}
              />
            ),
          },
          {
            key: "leave_popup",
            label: "Leaves",
            render: (r) => (
              <IconAction
                icon={<LeaveIcon />}
                label="View leaves"
                onClick={() => setModalState({ type: "leave", employee: r })}
              />
            ),
          },
        ]
      : []),
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          {restricted ? (
            <IconAction
              icon={<EyeIcon />}
              label="View employee"
              to={`/employees/${r.id}?restricted=1`}
            />
          ) : (
            <Link to={`/employees/${r.id}`} className="text-xs text-primary-600 hover:underline">
              View
            </Link>
          )}

          {/* Salary / Payslip actions hidden on the restricted (/employees) view */}
          {!restricted && (
            <>
              <Link to={`/employees/${r.id}/salary`} className="text-xs text-primary-600 hover:underline">
                Salary
              </Link>
              <Link to={`/employees/${r.id}/payslip`} className="text-xs text-primary-600 hover:underline">
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
      <DataTable columns={columns} data={data} loading={loading} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />

      {/* ATTENDANCE / LEAVES POPUPS — restricted (/employees) view only */}
      {restricted && (
        <>
          <Modal
            open={attendanceModalOpen}
            onClose={closeModal}
            title={`Attendance — ${employeeName(modalState?.employee)}`}
            size="xl"
          >
            <AttendanceTable
              data={attendanceData?.items || []}
              loading={attendanceLoading}
              sortBy={undefined}
              sortDir={undefined}
              onSort={() => {}}
            />
          </Modal>

          <Modal
            open={leaveModalOpen}
            onClose={closeModal}
            title={`Leaves — ${employeeName(modalState?.employee)}`}
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