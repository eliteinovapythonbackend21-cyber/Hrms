import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  usePayrollRecords,
  useCreatePayrollRecord,
  useUpdatePayrollRecord,
  useDeactivatePayrollRecord,
} from "./usePayrollRecords";

import PayrollRecordForm from "./PayrollRecordForm";

import { useCompanies } from "@/features/master/company/useCompanies";
import { useCompanyBranches } from "@/features/master/branches/useBranches";

import { masterApi } from "@/api/master.api";
import { employeeLifecycleApi } from "@/api/employee.api";

import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

import { formatCurrency } from "@/utils/formatCurrency";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

/* =========================================================
   RESPONSE HELPERS
========================================================= */

function getItems(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.items)) {
    return data.data.items;
  }

  return [];
}

/* =========================================================
   EMPLOYEE
========================================================= */

function getEmployee(payroll) {
  return (
    payroll?.employee ||
    payroll?.employee_data ||
    payroll?.employee_details ||
    null
  );
}

/* =========================================================
   DESIGNATION
========================================================= */

function getDesignation(payroll) {
  const employee = getEmployee(payroll);

  return (
    payroll?.designation ||
    payroll?.designation_details ||
    employee?.designation ||
    employee?.designation_details ||
    employee?.designation_data ||
    null
  );
}

/* =========================================================
   DEPARTMENT
========================================================= */

function getDepartment(payroll) {
  const employee = getEmployee(payroll);
  const designation = getDesignation(payroll);

  return (
    payroll?.department ||
    payroll?.department_details ||

    employee?.department ||
    employee?.department_details ||
    employee?.department_data ||

    designation?.department ||
    designation?.department_details ||

    null
  );
}

/* =========================================================
   BRANCH
========================================================= */

function getBranch(payroll) {
  const employee = getEmployee(payroll);
  const department = getDepartment(payroll);
  const designation = getDesignation(payroll);

  return (
    payroll?.branch ||
    payroll?.branch_details ||

    employee?.branch ||
    employee?.branch_details ||
    employee?.branch_data ||

    department?.branch ||
    department?.branch_details ||

    designation?.branch ||
    designation?.branch_details ||

    designation?.department?.branch ||
    designation?.department?.branch_details ||

    null
  );
}

/* =========================================================
   COMPANY
========================================================= */

function getCompany(payroll) {
  const employee = getEmployee(payroll);
  const department = getDepartment(payroll);
  const branch = getBranch(payroll);
  const designation = getDesignation(payroll);

  return (
    payroll?.company ||
    payroll?.company_details ||

    employee?.company ||
    employee?.company_details ||
    employee?.company_data ||

    department?.company ||
    department?.company_details ||

    branch?.company ||
    branch?.company_details ||

    designation?.company ||
    designation?.company_details ||

    designation?.department?.company ||
    designation?.department?.company_details ||

    designation?.branch?.company ||
    designation?.branch?.company_details ||

    null
  );
}

/* =========================================================
   EMPLOYEE DISPLAY
========================================================= */

function getEmployeeName(payroll) {
  const employee = getEmployee(payroll);

  if (!employee) {
    return `Employee #${
      payroll?.employee_id ?? "-"
    }`;
  }

  const fullName = [
    employee.first_name,
    employee.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    employee.full_name ||
    employee.employee_name ||
    employee.name ||
    fullName ||
    `Employee #${
      employee.id ??
      payroll?.employee_id ??
      "-"
    }`
  );
}

function getEmployeeCode(payroll) {
  const employee = getEmployee(payroll);

  return (
    employee?.employee_code ||
    employee?.employee_id ||
    payroll?.employee_code ||
    payroll?.employee_id ||
    "-"
  );
}

/* =========================================================
   COMPANY DISPLAY
========================================================= */

function getCompanyName(payroll) {
  const company = getCompany(payroll);

  return (
    company?.name ||
    company?.company_name ||
    company?.companyName ||
    company?.title ||
    payroll?.company_name ||
    "-"
  );
}

function getCompanyId(payroll) {
  const company = getCompany(payroll);
  const employee = getEmployee(payroll);

  return (
    payroll?.company_id ??
    company?.id ??
    employee?.company_id ??
    null
  );
}

/* =========================================================
   BRANCH DISPLAY
========================================================= */

function getBranchName(payroll) {
  const branch = getBranch(payroll);

  return (
    branch?.name ||
    branch?.branch_name ||
    branch?.branchName ||
    branch?.title ||
    payroll?.branch_name ||
    "-"
  );
}

function getBranchId(payroll) {
  const branch = getBranch(payroll);
  const employee = getEmployee(payroll);

  return (
    payroll?.branch_id ??
    branch?.id ??
    employee?.branch_id ??
    null
  );
}

/* =========================================================
   DEPARTMENT DISPLAY
========================================================= */

function getDepartmentName(payroll) {
  const department = getDepartment(payroll);

  return (
    department?.department_name ||
    department?.name ||
    department?.departmentName ||
    department?.title ||
    payroll?.department_name ||
    "-"
  );
}

function getDepartmentCode(payroll) {
  const department = getDepartment(payroll);

  return (
    department?.department_code ||
    department?.code ||
    payroll?.department_code ||
    "-"
  );
}

function getDepartmentId(payroll) {
  const department = getDepartment(payroll);
  const employee = getEmployee(payroll);

  return (
    payroll?.department_id ??
    department?.id ??
    employee?.department_id ??
    null
  );
}

/* =========================================================
   DESIGNATION DISPLAY
========================================================= */

function getDesignationName(payroll) {
  const designation = getDesignation(payroll);

  return (
    designation?.designation_name ||
    designation?.name ||
    designation?.designationName ||
    designation?.title ||
    payroll?.designation_name ||
    "-"
  );
}

function getDesignationCode(payroll) {
  const designation = getDesignation(payroll);

  return (
    designation?.designation_code ||
    designation?.code ||
    payroll?.designation_code ||
    "-"
  );
}

function getDesignationId(payroll) {
  const designation = getDesignation(payroll);
  const employee = getEmployee(payroll);

  return (
    payroll?.designation_id ??
    designation?.id ??
    employee?.designation_id ??
    null
  );
}

/* =========================================================
   AMOUNT
========================================================= */

function normalizeAmount(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/* =========================================================
   PAYROLL STATUS
========================================================= */

function getPayrollStatus(payroll) {
  if (payroll?.is_active === false) {
    return "Inactive";
  }

  return payroll?.status || "Draft";
}

function getStatusClass(status) {
  const classes = {
    Draft:
      "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",

    Pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",

    Paid:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",

    Inactive:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  };

  return classes[status] || classes.Draft;
}

function statusBadge(payroll) {
  const status = getPayrollStatus(payroll);

  const dotClass =
    status === "Paid"
      ? "bg-emerald-500"
      : status === "Inactive"
      ? "bg-red-500"
      : status === "Draft"
      ? "bg-slate-500"
      : "bg-amber-500";

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${getStatusClass(
        status
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
      />

      {status}
    </Badge>
  );
}

/* =========================================================
   PAY MONTH
========================================================= */

function formatPayMonth(value) {
  if (!value) {
    return "-";
  }

  const raw = String(value);

  const match = raw.match(
    /^(\d{4})-(\d{2})$/
  );

  if (!match) {
    return raw;
  }

  const [, year, month] = match;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    1
  );

  return date.toLocaleString(
    undefined,
    {
      month: "short",
      year: "numeric",
    }
  );
}

/* =========================================================
   HOVER
========================================================= */

function HoverDetailsTrigger({
  children,
  panel,
  align = "left",
}) {
  const alignClasses = {
    left: "left-0",
    center:
      "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div
      tabIndex={0}
      className="group/payroll-details relative inline-flex max-w-full outline-none"
    >
      <div className="max-w-full">
        {children}
      </div>

      <div
        className={`
          pointer-events-none
          invisible
          absolute
          top-full
          z-[100]
          mt-2
          opacity-0
          transition-all
          duration-150
          group-hover/payroll-details:pointer-events-auto
          group-hover/payroll-details:visible
          group-hover/payroll-details:opacity-100
          group-focus/payroll-details:pointer-events-auto
          group-focus/payroll-details:visible
          group-focus/payroll-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   DETAILS CARD
========================================================= */

function PayrollDetailsCard({
  payroll,
}) {
  const employeeName =
    getEmployeeName(payroll);

  const employeeCode =
    getEmployeeCode(payroll);

  const companyName =
    getCompanyName(payroll);

  const branchName =
    getBranchName(payroll);

  const departmentName =
    getDepartmentName(payroll);

  const departmentCode =
    getDepartmentCode(payroll);

  const designationName =
    getDesignationName(payroll);

  const designationCode =
    getDesignationCode(payroll);

  const gross =
    normalizeAmount(
      payroll?.gross_salary
    );

  const deductions =
    normalizeAmount(
      payroll?.deductions
    );

  const net =
    normalizeAmount(
      payroll?.net_salary
    );

  return (
    <div className="w-[430px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Payroll Details
          </p>

          <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-white">
            {employeeName}
          </p>

          <p className="text-[10px] text-slate-400">
            {employeeCode}
          </p>
        </div>

        {statusBadge(payroll)}
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <DetailRow
          label="Company"
          value={companyName}
        />

        <DetailRow
          label="Branch"
          value={branchName}
        />

        <DetailRow
          label="Department"
          value={departmentName}
        />

        {departmentCode !== "-" && (
          <DetailRow
            label="Dept. Code"
            value={departmentCode}
            mono
          />
        )}

        <DetailRow
          label="Designation"
          value={designationName}
          valueClass="text-violet-600 dark:text-violet-400"
        />

        {designationCode !== "-" && (
          <DetailRow
            label="Designation Code"
            value={designationCode}
            mono
            valueClass="text-violet-600 dark:text-violet-400"
          />
        )}

        <DetailRow
          label="Pay Month"
          value={formatPayMonth(
            payroll?.pay_month
          )}
        />
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-3 gap-2">
        <SalaryBox
          label="Gross"
          value={gross}
        />

        <SalaryBox
          label="Deductions"
          value={deductions}
          tone="red"
        />

        <SalaryBox
          label="Net"
          value={net}
          tone="green"
        />
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">
            Employee ID
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
            #{payroll?.employee_id ?? "-"}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">
            Payroll ID
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
            #{payroll?.id ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
  valueClass = "text-slate-700 dark:text-slate-200",
}) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
      <span className="text-xs text-slate-400">
        {label}
      </span>

      <span
        className={`truncate text-right text-xs font-medium ${valueClass} ${
          mono ? "font-mono text-[10px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SalaryBox({
  label,
  value,
  tone = "slate",
}) {
  const classes = {
    slate:
      "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200",

    red:
      "bg-red-50/70 text-red-600 dark:bg-red-500/5 dark:text-red-300",

    green:
      "bg-emerald-50/70 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-300",
  };

  return (
    <div
      className={`rounded-lg p-2 ${classes[tone]}`}
    >
      <p className="text-[9px] uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold">
        {formatCurrency(value)}
      </p>
    </div>
  );
}

/* =========================================================
   ICONS
========================================================= */

const PayrollIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <rect
      x="5"
      y="4"
      width="14"
      height="16"
      rx="1.5"
    />

    <path
      strokeLinecap="round"
      d="M8 8h8M8 12h8M8 16h5"
    />
  </svg>
);

const MoneyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
    />

    <path
      strokeLinecap="round"
      d="M12 7v10M15 9c-.5-1.5-1.5-2-3-2-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 .9 3 2.3-1.3 2.3-3 2.3c-1.5 0-2.6-.5-3.2-1.5"
    />
  </svg>
);

const PaidIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m8 12 2.5 2.5L16 9"
    />
  </svg>
);

const PendingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
    />

    <path
      strokeLinecap="round"
      d="M12 7v5l3 2"
    />
  </svg>
);

const CompanyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M15 7h2M15 11h2"
    />
  </svg>
);

const BranchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 21h16M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16"
    />

    <path
      strokeLinecap="round"
      d="M9 7h1M9 11h1M14 7h1M14 11h1"
    />
  </svg>
);

const DepartmentIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <path
      strokeLinecap="round"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const DesignationIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2"
    />

    <path
      strokeLinecap="round"
      d="M8 9h8M8 12h8M8 15h5"
    />
  </svg>
);

const EmployeeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.8}
  >
    <circle
      cx="9"
      cy="7"
      r="4"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"
    />

    <path
      strokeLinecap="round"
      d="M16 11a4 4 0 100-8M19 21v-2a4 4 0 00-3-3.87"
    />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  value,
  label,
  caption,
  tone = "primary",
}) {
  const tones = {
    primary:
      "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",

    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",

    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };

  return (
    <div className="h-[112px] rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-full items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {caption}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ICON BUTTON
========================================================= */

function IconButton({
  onClick,
  title,
  disabled,
  tone = "slate",
  children,
}) {
  const tones = {
    slate:
      "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",

    red:
      "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10",

    emerald:
      "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function PayrollRecordListPage() {
  const { showToast } = useToast();

  /* =======================================================
     FILTER STATE
  ======================================================= */

  const [
    companyFilterId,
    setCompanyFilterId,
  ] = useState("");

  const [
    branchFilterId,
    setBranchFilterId,
  ] = useState("");

  const [
    departmentFilterId,
    setDepartmentFilterId,
  ] = useState("");

  const [
    designationFilterId,
    setDesignationFilterId,
  ] = useState("");

  const [
    employeeFilterId,
    setEmployeeFilterId,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  const [search, setSearch] =
    useState("");

  const [viewMode, setViewMode] =
    useState("card");

  const [page, setPage] =
    useState(1);

  /* =======================================================
     MODAL STATE
  ======================================================= */

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    selectedPayroll,
    setSelectedPayroll,
  ] = useState(null);

  const [
    payrollToDelete,
    setPayrollToDelete,
  ] = useState(null);

  /* =======================================================
     MASTER DATA
  ======================================================= */

  const { data: companyData } =
    useCompanies({
      page: 1,
      per_page: 100,
      is_active: true,
    });

  const { data: branchData } =
    useCompanyBranches(
      companyFilterId,
      {
        page: 1,
        per_page: 100,
        is_active: true,
      }
    );

  const { data: departmentData } =
    useQuery({
      queryKey: [
        "payroll-departments-filter",
        branchFilterId,
      ],

      queryFn: async () => {
        const response =
          await masterApi.listDepartments(
            {
              branch_id:
                branchFilterId,
              page: 1,
              per_page: 100,
              is_active: true,
            }
          );

        return (
          response?.data?.data ||
          response?.data ||
          {}
        );
      },

      enabled:
        Boolean(branchFilterId),
    });

  /* =======================================================
     PAYROLL
  ======================================================= */

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePayrollRecords({
    page: 1,
    per_page: 1000,
    search:
      search || undefined,
  });

  const allPayroll = getItems(data);

  const filterCompanies =
    getItems(companyData);

  const filterBranches =
    getItems(branchData);

  const filterDepartments =
    getItems(departmentData);

  /* =======================================================
     DESIGNATION OPTIONS
  ======================================================= */

  const designationOptions =
    useMemo(() => {
      const map = new Map();

      allPayroll.forEach(
        (payroll) => {
          const designation =
            getDesignation(
              payroll
            );

          if (!designation?.id) {
            return;
          }

          map.set(
            String(
              designation.id
            ),
            {
              value:
                designation.id,

              label:
                designation.designation_name ||
                designation.name ||
                `Designation #${designation.id}`,
            }
          );
        }
      );

      return [...map.values()].sort(
        (a, b) =>
          String(a.label).localeCompare(
            String(b.label)
          )
      );
    }, [allPayroll]);

  /* =======================================================
     EMPLOYEE OPTIONS
  ======================================================= */

  const employeeOptions =
    useMemo(() => {
      const map = new Map();

      allPayroll.forEach(
        (payroll) => {
          const employee =
            getEmployee(payroll);

          const employeeId =
            payroll?.employee_id ??
            employee?.id;

          if (!employeeId) {
            return;
          }

          map.set(
            String(employeeId),
            {
              value: employeeId,
              label:
                getEmployeeName(
                  payroll
                ),
            }
          );
        }
      );

      return [...map.values()].sort(
        (a, b) =>
          String(a.label).localeCompare(
            String(b.label)
          )
      );
    }, [allPayroll]);

  /* =======================================================
     FILTERED PAYROLL
  ======================================================= */

  const filteredPayroll =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return allPayroll.filter(
        (payroll) => {
          const isActive =
            payroll?.is_active !==
            false;

          if (
            statusFilter ===
              "active" &&
            !isActive
          ) {
            return false;
          }

          if (
            statusFilter ===
              "inactive" &&
            isActive
          ) {
            return false;
          }

          if (
            companyFilterId &&
            String(
              getCompanyId(
                payroll
              )
            ) !==
              String(
                companyFilterId
              )
          ) {
            return false;
          }

          if (
            branchFilterId &&
            String(
              getBranchId(
                payroll
              )
            ) !==
              String(
                branchFilterId
              )
          ) {
            return false;
          }

          if (
            departmentFilterId &&
            String(
              getDepartmentId(
                payroll
              )
            ) !==
              String(
                departmentFilterId
              )
          ) {
            return false;
          }

          if (
            designationFilterId &&
            String(
              getDesignationId(
                payroll
              )
            ) !==
              String(
                designationFilterId
              )
          ) {
            return false;
          }

          if (
            employeeFilterId &&
            String(
              payroll?.employee_id
            ) !==
              String(
                employeeFilterId
              )
          ) {
            return false;
          }

          if (normalizedSearch) {
            const haystack = [
              payroll?.id,
              payroll?.employee_id,
              getEmployeeName(payroll),
              getEmployeeCode(payroll),
              getCompanyName(payroll),
              getBranchName(payroll),
              getDepartmentName(payroll),
              getDesignationName(payroll),
              getDesignationCode(payroll),
              payroll?.pay_month,
              payroll?.status,
            ]
              .join(" ")
              .toLowerCase();

            if (
              !haystack.includes(
                normalizedSearch
              )
            ) {
              return false;
            }
          }

          return true;
        }
      );
    }, [
      allPayroll,
      companyFilterId,
      branchFilterId,
      departmentFilterId,
      designationFilterId,
      employeeFilterId,
      statusFilter,
      search,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const pageSize =
    viewMode === "card"
      ? CARD_PAGE_SIZE
      : PAGE_SIZE;

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        filteredPayroll.length /
          pageSize
      )
    );

  const pagedPayroll =
    filteredPayroll.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

  /* =======================================================
     STATISTICS
  ======================================================= */

  const activePayroll =
    allPayroll.filter(
      (item) =>
        item?.is_active !== false
    );

  const paidPayroll =
    activePayroll.filter(
      (item) =>
        getPayrollStatus(item) ===
        "Paid"
    );

  const pendingPayroll =
    activePayroll.filter(
      (item) =>
        getPayrollStatus(item) !==
        "Paid"
    );

  const totalGross =
    activePayroll.reduce(
      (sum, item) =>
        sum +
        normalizeAmount(
          item?.gross_salary
        ),
      0
    );

  const totalNet =
    activePayroll.reduce(
      (sum, item) =>
        sum +
        normalizeAmount(
          item?.net_salary
        ),
      0
    );

  /* =======================================================
     MUTATIONS
  ======================================================= */

  const createPayroll =
    useCreatePayrollRecord();

  const updatePayroll =
    useUpdatePayrollRecord();

  const deactivatePayroll =
    useDeactivatePayrollRecord();

  /* =======================================================
     EXPORT
  ======================================================= */

  const exportColumns = useMemo(
    () => [
      {
        header: "Employee ID",
        accessor: (r) =>
          r?.employee_id || "-",
      },

      {
        header: "Employee",
        accessor: (r) =>
          getEmployeeName(r),
      },

      {
        header: "Company",
        accessor: (r) =>
          getCompanyName(r),
      },

      {
        header: "Branch",
        accessor: (r) =>
          getBranchName(r),
      },

      {
        header: "Department",
        accessor: (r) =>
          getDepartmentName(r),
      },

      {
        header: "Designation",
        accessor: (r) =>
          getDesignationName(r),
      },

      {
        header: "Pay Month",
        accessor: (r) =>
          r?.pay_month || "-",
      },

      {
        header: "Gross Salary",
        accessor: (r) =>
          formatCurrency(
            r?.gross_salary
          ),
      },

      {
        header: "Deductions",
        accessor: (r) =>
          formatCurrency(
            r?.deductions
          ),
      },

      {
        header: "Net Salary",
        accessor: (r) =>
          formatCurrency(
            r?.net_salary
          ),
      },

      {
        header: "Status",
        accessor: (r) =>
          getPayrollStatus(r),
      },

      {
        header: "Active",
        accessor: (r) =>
          r?.is_active !== false
            ? "Yes"
            : "No",
      },
    ],
    []
  );

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      employeeLifecycleApi.payroll
        .list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns,

    filename: "payroll",

    title: "Payroll Records",
  });

  /* =======================================================
     FILTER HANDLERS
  ======================================================= */

  const handleCompanyFilterChange =
    (event) => {
      setCompanyFilterId(
        event.target.value
      );

      setBranchFilterId("");
      setDepartmentFilterId("");
      setDesignationFilterId("");
      setEmployeeFilterId("");
      setPage(1);
    };

  const handleBranchFilterChange =
    (event) => {
      setBranchFilterId(
        event.target.value
      );

      setDepartmentFilterId("");
      setDesignationFilterId("");
      setEmployeeFilterId("");
      setPage(1);
    };

  const handleDepartmentFilterChange =
    (event) => {
      setDepartmentFilterId(
        event.target.value
      );

      setDesignationFilterId("");
      setEmployeeFilterId("");
      setPage(1);
    };

  const handleDesignationFilterChange =
    (event) => {
      setDesignationFilterId(
        event.target.value
      );

      setEmployeeFilterId("");
      setPage(1);
    };

  const handleEmployeeFilterChange =
    (event) => {
      setEmployeeFilterId(
        event.target.value
      );
      setPage(1);
    };

  /* =======================================================
     CRUD HANDLERS
  ======================================================= */

  const handleAdd = () => {
    setSelectedPayroll(null);
    setModalOpen(true);
  };

  const handleEdit = (
    payroll
  ) => {
    setSelectedPayroll({
      ...payroll,

      employee_id:
        payroll?.employee_id ??
        payroll?.employee?.id ??
        "",
    });

    setModalOpen(true);
  };

  const handleCloseModal =
    () => {
      setModalOpen(false);
      setSelectedPayroll(null);
    };

  const handleSubmit =
    async (payload) => {
      try {
        const normalizedPayload = {
          ...payload,

          employee_id:
            payload?.employee_id
              ? Number(
                  payload.employee_id
                )
              : null,

          gross_salary:
            payload?.gross_salary !==
              "" &&
            payload?.gross_salary != null
              ? Number(
                  payload.gross_salary
                )
              : 0,

          deductions:
            payload?.deductions !==
              "" &&
            payload?.deductions != null
              ? Number(
                  payload.deductions
                )
              : 0,

          net_salary:
            payload?.net_salary !==
              "" &&
            payload?.net_salary != null
              ? Number(
                  payload.net_salary
                )
              : 0,

          status:
            payload?.status ||
            "Draft",
        };

        if (selectedPayroll) {
          await updatePayroll.mutateAsync(
            {
              id:
                selectedPayroll.id,
              payload:
                normalizedPayload,
            }
          );

          showToast(
            "Payroll record updated successfully",
            "success"
          );
        } else {
          await createPayroll.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Payroll record created successfully",
            "success"
          );
        }

        handleCloseModal();
        await refetch();
      } catch (err) {
        console.error(
          "Payroll save failed:",
          err
        );

        showToast(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Failed to save payroll record",
          "error"
        );
      }
    };

  const handleDelete = (
    payroll
  ) => {
    setPayrollToDelete(
      payroll
    );
  };

  const confirmDelete =
    async () => {
      if (!payrollToDelete) {
        return;
      }

      try {
        await deactivatePayroll.mutateAsync(
          payrollToDelete.id
        );

        showToast(
          "Payroll record deactivated successfully",
          "success"
        );

        setPayrollToDelete(null);
        await refetch();
      } catch (err) {
        console.error(
          "Payroll deactivation failed:",
          err
        );

        showToast(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Failed to deactivate payroll record",
          "error"
        );
      }
    };

  const handleReactivate =
    async (payroll) => {
      try {
        await updatePayroll.mutateAsync(
          {
            id: payroll.id,

            payload: {
              is_active: true,
            },
          }
        );

        showToast(
          "Payroll record reactivated successfully",
          "success"
        );

        await refetch();
      } catch (err) {
        console.error(
          "Payroll reactivation failed:",
          err
        );

        showToast(
          err?.response?.data
            ?.message ||
            err?.message ||
            "Failed to reactivate payroll record",
          "error"
        );
      }
    };

  const clearFilters = () => {
    setSearch("");
    setCompanyFilterId("");
    setBranchFilterId("");
    setDepartmentFilterId("");
    setDesignationFilterId("");
    setEmployeeFilterId("");
    setStatusFilter("active");
    setPage(1);
  };

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <h2 className="font-semibold">
            Failed to load payroll
            records
          </h2>

          <p className="mt-1 text-sm">
            {error?.response?.data
              ?.message ||
              error?.message ||
              "Unable to load payroll records."}
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-sm">
            <PayrollIcon />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Payroll Records
            </h1>

            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Employee payroll across company hierarchy
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={
              exportExcel
            }
            onExportPDF={
              exportPDF
            }
            exporting={exporting}
          />

          <Button
            type="button"
            onClick={handleAdd}
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>

            Add Payroll
          </Button>
        </div>
      </div>

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<PayrollIcon />}
          value={
            allPayroll.length
          }
          label="Total Payroll Records"
          caption="All payroll periods"
          tone="primary"
        />

        <StatCard
          icon={<PaidIcon />}
          value={
            paidPayroll.length
          }
          label="Paid Payroll"
          caption="Completed payroll"
          tone="emerald"
        />

        <StatCard
          icon={<PendingIcon />}
          value={
            pendingPayroll.length
          }
          label="Pending Payroll"
          caption="Awaiting payment"
          tone="amber"
        />

        <StatCard
          icon={<MoneyIcon />}
          value={formatCurrency(
            totalNet
          )}
          label="Net Payroll"
          caption={`Gross ${formatCurrency(
            totalGross
          )}`}
          tone="primary"
        />
      </div>

      {/* FILTERS */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
            {/* SEARCH */}

            <div className="relative md:col-span-2 xl:col-span-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z"
                  />
                </svg>
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search employee, company, branch, designation..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* COMPANY */}

            <select
              value={companyFilterId}
              onChange={
                handleCompanyFilterChange
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Companies
              </option>

              {filterCompanies.map(
                (company) => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name ||
                      company.company_name}
                  </option>
                )
              )}
            </select>

            {/* BRANCH */}

            <select
              value={branchFilterId}
              onChange={
                handleBranchFilterChange
              }
              disabled={!companyFilterId}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                {companyFilterId
                  ? "All Branches"
                  : "Select company first"}
              </option>

              {filterBranches.map(
                (branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
                  >
                    {branch.name ||
                      branch.branch_name}
                  </option>
                )
              )}
            </select>

            {/* DEPARTMENT */}

            <select
              value={
                departmentFilterId
              }
              onChange={
                handleDepartmentFilterChange
              }
              disabled={!branchFilterId}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                {branchFilterId
                  ? "All Departments"
                  : "Select branch first"}
              </option>

              {filterDepartments.map(
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {
                      department.department_name
                    }
                  </option>
                )
              )}
            </select>

            {/* DESIGNATION */}

            <select
              value={
                designationFilterId
              }
              onChange={
                handleDesignationFilterChange
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Designations
              </option>

              {designationOptions.map(
                (designation) => (
                  <option
                    key={
                      designation.value
                    }
                    value={
                      designation.value
                    }
                  >
                    {
                      designation.label
                    }
                  </option>
                )
              )}
            </select>

            {/* EMPLOYEE */}

            <select
              value={
                employeeFilterId
              }
              onChange={
                handleEmployeeFilterChange
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Employees
              </option>

              {employeeOptions.map(
                (employee) => (
                  <option
                    key={
                      employee.value
                    }
                    value={
                      employee.value
                    }
                  >
                    {employee.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {/* VIEW */}

              <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode(
                      "table"
                    );
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    viewMode ===
                    "table"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Table
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode(
                      "card"
                    );
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    viewMode ===
                    "card"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  Card
                </button>
              </div>

              {/* STATUS */}

              <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                {[
                  "active",
                  "inactive",
                  "all",
                ].map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setStatusFilter(
                          status
                        );
                        setPage(1);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                        statusFilter ===
                        status
                          ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>

            {(search ||
              companyFilterId ||
              branchFilterId ||
              departmentFilterId ||
              designationFilterId ||
              employeeFilterId ||
              statusFilter !==
                "active") && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LOADING */}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 6,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="h-[390px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            )
          )}
        </div>
      )}

      {/* ===================================================
          TABLE VIEW
      =================================================== */}

      {!isLoading &&
        viewMode === "table" &&
        pagedPayroll.length > 0 && (
          <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full min-w-[1300px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Employee
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Company
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Branch
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Department
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Designation
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Pay Month
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Gross
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Deductions
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Net
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedPayroll.map(
                  (payroll) => (
                    <tr
                      key={
                        payroll.id
                      }
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {/* EMPLOYEE */}

                      <td className="px-4 py-3">
                        <HoverDetailsTrigger
                          panel={
                            <PayrollDetailsCard
                              payroll={
                                payroll
                              }
                            />
                          }
                        >
                          <div className="flex cursor-pointer items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                              {getEmployeeName(
                                payroll
                              )
                                .charAt(
                                  0
                                )
                                .toUpperCase() ||
                                "E"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                {getEmployeeName(
                                  payroll
                                )}
                              </p>

                              <p className="font-mono text-[10px] text-slate-400">
                                {getEmployeeCode(
                                  payroll
                                )}
                              </p>
                            </div>
                          </div>
                        </HoverDetailsTrigger>
                      </td>

                      {/* COMPANY */}

                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {getCompanyName(
                            payroll
                          )}
                        </p>
                      </td>

                      {/* BRANCH */}

                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate text-sm text-slate-600 dark:text-slate-300">
                          {getBranchName(
                            payroll
                          )}
                        </p>
                      </td>

                      {/* DEPARTMENT */}

                      <td className="px-4 py-3">
                        <p className="max-w-[180px] truncate text-sm text-slate-600 dark:text-slate-300">
                          {getDepartmentName(
                            payroll
                          )}
                        </p>

                        {getDepartmentCode(
                          payroll
                        ) !== "-" && (
                          <p className="font-mono text-[9px] text-slate-400">
                            {getDepartmentCode(
                              payroll
                            )}
                          </p>
                        )}
                      </td>

                      {/* DESIGNATION */}

                      <td className="px-4 py-3">
                        <p className="max-w-[200px] truncate text-sm font-semibold text-violet-600 dark:text-violet-400">
                          {getDesignationName(
                            payroll
                          )}
                        </p>

                        {getDesignationCode(
                          payroll
                        ) !== "-" && (
                          <p className="font-mono text-[9px] text-violet-400 dark:text-violet-500">
                            {getDesignationCode(
                              payroll
                            )}
                          </p>
                        )}
                      </td>

                      {/* PAY MONTH */}

                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {formatPayMonth(
                            payroll?.pay_month
                          )}
                        </span>
                      </td>

                      {/* GROSS */}

                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(
                          payroll?.gross_salary
                        )}
                      </td>

                      {/* DEDUCTIONS */}

                      <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(
                          payroll?.deductions
                        )}
                      </td>

                      {/* NET */}

                      <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(
                          payroll?.net_salary
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-3">
                        {statusBadge(
                          payroll
                        )}
                      </td>

                      {/* ACTIONS */}

                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton
                            title="Edit"
                            onClick={() =>
                              handleEdit(
                                payroll
                              )
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z"
                              />
                            </svg>
                          </IconButton>

                          {payroll?.is_active !==
                          false ? (
                            <IconButton
                              title="Deactivate"
                              tone="red"
                              disabled={
                                deactivatePayroll.isPending
                              }
                              onClick={() =>
                                handleDelete(
                                  payroll
                                )
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z"
                                />
                              </svg>
                            </IconButton>
                          ) : (
                            <IconButton
                              title="Reactivate"
                              tone="emerald"
                              disabled={
                                updatePayroll.isPending
                              }
                              onClick={() =>
                                handleReactivate(
                                  payroll
                                )
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 017-4M4 20v-5h5"
                                />
                              </svg>
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

      {/* ===================================================
          CARD VIEW
      =================================================== */}

      {!isLoading &&
        viewMode === "card" &&
        pagedPayroll.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pagedPayroll.map(
              (payroll) => {
                const employeeName =
                  getEmployeeName(
                    payroll
                  );

                const employeeCode =
                  getEmployeeCode(
                    payroll
                  );

                const companyName =
                  getCompanyName(
                    payroll
                  );

                const branchName =
                  getBranchName(
                    payroll
                  );

                const departmentName =
                  getDepartmentName(
                    payroll
                  );

                const departmentCode =
                  getDepartmentCode(
                    payroll
                  );

                const designationName =
                  getDesignationName(
                    payroll
                  );

                const designationCode =
                  getDesignationCode(
                    payroll
                  );

                const gross =
                  normalizeAmount(
                    payroll?.gross_salary
                  );

                const deductions =
                  normalizeAmount(
                    payroll?.deductions
                  );

                const net =
                  normalizeAmount(
                    payroll?.net_salary
                  );

                const isActive =
                  payroll?.is_active !==
                  false;

                return (
                  <div
                    key={
                      payroll.id
                    }
                    className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900 ${
                      isActive
                        ? "border-slate-200 hover:border-primary-200 dark:border-slate-700 dark:hover:border-primary-500/40"
                        : "border-red-100 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10"
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-0.5 ${
                        isActive
                          ? "bg-primary-600"
                          : "bg-red-500"
                      }`}
                    />

                    <div className="p-4">
                      {/* EMPLOYEE HEADER */}

                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <HoverDetailsTrigger
                            panel={
                              <PayrollDetailsCard
                                payroll={
                                  payroll
                                }
                              />
                            }
                          >
                            <div className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-primary-50 text-base font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                              {employeeName
                                .charAt(
                                  0
                                )
                                .toUpperCase() ||
                                "E"}
                            </div>
                          </HoverDetailsTrigger>

                          <div className="min-w-0">
                            <h3
                              title={
                                employeeName
                              }
                              className="truncate text-sm font-semibold text-slate-900 dark:text-white"
                            >
                              {
                                employeeName
                              }
                            </h3>

                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                                Employee
                              </span>

                              <span className="truncate font-mono text-[10px] font-medium text-slate-600 dark:text-slate-300">
                                {
                                  employeeCode
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {statusBadge(
                            payroll
                          )}
                        </div>
                      </div>

                      <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                      {/* HIERARCHY */}

                      <div className="space-y-2.5">
                        {/* COMPANY */}

                        <HierarchyRow
                          icon={
                            <CompanyIcon />
                          }
                          label="Company"
                          value={
                            companyName
                          }
                          tone="primary"
                        />

                        {/* BRANCH */}

                        <div className="ml-3.5 border-l border-dashed border-slate-200 pl-4 dark:border-slate-700">
                          <HierarchyRow
                            icon={
                              <BranchIcon />
                            }
                            label="Branch"
                            value={
                              branchName
                            }
                            tone="slate"
                          />

                          {/* DEPARTMENT */}

                          <div className="mt-2 ml-3.5 border-l border-dashed border-slate-200 pl-4 dark:border-slate-700">
                            <HierarchyRow
                              icon={
                                <DepartmentIcon />
                              }
                              label="Department"
                              value={
                                departmentName
                              }
                              code={
                                departmentCode !==
                                "-"
                                  ? departmentCode
                                  : null
                              }
                              tone="slate"
                            />

                            {/* DESIGNATION */}

                            <div className="mt-2 ml-3.5 border-l border-dashed border-violet-200 pl-4 dark:border-violet-500/20">
                              <HierarchyRow
                                icon={
                                  <DesignationIcon />
                                }
                                label="Designation"
                                value={
                                  designationName
                                }
                                code={
                                  designationCode !==
                                  "-"
                                    ? designationCode
                                    : null
                                }
                                tone="violet"
                              />

                              {/* EMPLOYEE */}

                              <div className="mt-2 ml-3.5 border-l border-dashed border-primary-200 pl-4 dark:border-primary-500/20">
                                <HierarchyRow
                                  icon={
                                    <EmployeeIcon />
                                  }
                                  label="Employee"
                                  value={
                                    employeeName
                                  }
                                  tone="primary"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PAYROLL SUMMARY */}

                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Payroll Period
                            </p>

                            <p className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-white">
                              {formatPayMonth(
                                payroll?.pay_month
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm dark:bg-slate-900">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Payroll ID
                            </p>

                            <p className="text-right text-[10px] font-bold text-primary-600 dark:text-primary-400">
                              #{payroll?.id}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <SalarySummary
                            label="Gross"
                            value={
                              gross
                            }
                          />

                          <SalarySummary
                            label="Deductions"
                            value={
                              deductions
                            }
                            tone="red"
                          />

                          <SalarySummary
                            label="Net"
                            value={
                              net
                            }
                            tone="green"
                          />
                        </div>
                      </div>

                      {/* ACTIONS */}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              payroll
                            )
                          }
                          className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
                        >
                          Edit
                        </button>

                        {isActive ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                payroll
                              )
                            }
                            disabled={
                              deactivatePayroll.isPending
                            }
                            className="flex flex-1 items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleReactivate(
                                payroll
                              )
                            }
                            disabled={
                              updatePayroll.isPending
                            }
                            className="flex flex-1 items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>

                    {/* FOOTER */}

                    <div
                      className={`border-t px-4 py-2 ${
                        isActive
                          ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30"
                          : "border-red-100 bg-red-50/50 dark:border-red-900/20 dark:bg-red-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">
                          Payroll Status
                        </span>

                        <span
                          className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                            isActive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isActive
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            }`}
                          />

                          {isActive
                            ? "Operational"
                            : "Deactivated"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

      {/* EMPTY */}

      {!isLoading &&
        filteredPayroll.length ===
          0 && (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
              <PayrollIcon />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-white">
              No payroll records found
            </h3>

            <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              No payroll records match
              your current company,
              branch, department,
              designation, employee,
              search, or status
              filters.
            </p>

            <Button
              onClick={handleAdd}
              className="mt-4 h-9 px-4 text-sm"
            >
              + Add Payroll
            </Button>
          </div>
        )}

      {/* PAGINATION */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() =>
              setPage(
                (current) =>
                  Math.max(
                    1,
                    current - 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >= pageCount
            }
            onClick={() =>
              setPage(
                (current) =>
                  Math.min(
                    pageCount,
                    current + 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* MODAL */}

      <Modal
        open={modalOpen}
        onClose={
          handleCloseModal
        }
        title={
          selectedPayroll
            ? "Edit Payroll Record"
            : "Add Payroll Record"
        }
      >
        <PayrollRecordForm
          key={
            selectedPayroll?.id ??
            "new-payroll"
          }
          initialData={
            selectedPayroll || {}
          }
          isEdit={
            Boolean(
              selectedPayroll
            )
          }
          onSubmit={
            handleSubmit
          }
          onCancel={
            handleCloseModal
          }
          loading={
            createPayroll.isPending ||
            updatePayroll.isPending
          }
        />
      </Modal>

      {/* CONFIRM DELETE */}

      <ConfirmDialog
        open={
          Boolean(
            payrollToDelete
          )
        }
        onClose={() =>
          setPayrollToDelete(
            null
          )
        }
        onConfirm={
          confirmDelete
        }
        title="Deactivate Payroll Record"
        message={
          payrollToDelete
            ? `Are you sure you want to deactivate the payroll record for ${getEmployeeName(
                payrollToDelete
              )} for ${formatPayMonth(
                payrollToDelete?.pay_month
              )}?`
            : ""
        }
        confirmText="Deactivate"
        loading={
          deactivatePayroll.isPending
        }
      />
    </div>
  );
}

/* =========================================================
   HIERARCHY ROW
========================================================= */

function HierarchyRow({
  icon,
  label,
  value,
  code,
  tone = "slate",
}) {
  const iconClasses = {
    primary:
      "bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400",

    slate:
      "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",

    violet:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  };

  const valueClasses = {
    primary:
      "text-slate-700 dark:text-slate-200",

    slate:
      "text-slate-700 dark:text-slate-200",

    violet:
      "text-violet-600 dark:text-violet-400",
  };

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconClasses[tone]}`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <div className="flex min-w-0 items-center gap-1.5">
          <p
            title={value}
            className={`truncate text-[11px] font-semibold ${valueClasses[tone]}`}
          >
            {value}
          </p>

          {code && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] ${
                tone === "violet"
                  ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SALARY SUMMARY
========================================================= */

function SalarySummary({
  label,
  value,
  tone = "slate",
}) {
  const classes = {
    slate:
      "text-slate-700 dark:text-slate-200",

    red:
      "text-red-600 dark:text-red-400",

    green:
      "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-0.5 text-[11px] font-semibold ${classes[tone]}`}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}