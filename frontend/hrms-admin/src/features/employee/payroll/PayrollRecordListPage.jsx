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

const CARD_HEIGHT = "h-[365px]";

/* =========================================================
   EXPORT
========================================================= */

const EXPORT_COLUMNS = [
  {
    header: "Employee ID",
    accessor: (r) =>
      r.employee_id || "-",
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
    header: "Pay Month",
    accessor: (r) =>
      r.pay_month || "-",
  },

  {
    header: "Gross Salary",
    accessor: (r) =>
      formatCurrency(
        r.gross_salary
      ),
  },

  {
    header: "Deductions",
    accessor: (r) =>
      formatCurrency(
        r.deductions
      ),
  },

  {
    header: "Net Salary",
    accessor: (r) =>
      formatCurrency(
        r.net_salary
      ),
  },

  {
    header: "Status",
    accessor: (r) =>
      r.status || "Pending",
  },

  {
    header: "Active",
    accessor: (r) =>
      r.is_active !== false
        ? "Yes"
        : "No",
  },
];

/* =========================================================
   DATA HELPERS
========================================================= */

function getEmployee(payroll) {
  return (
    payroll?.employee ||
    payroll?.employee_data ||
    null
  );
}

function getDepartment(payroll) {
  const employee =
    getEmployee(payroll);

  return (
    payroll?.department ||
    payroll?.department_details ||
    employee?.department ||
    employee?.department_details ||
    null
  );
}

function getBranch(payroll) {
  const employee =
    getEmployee(payroll);

  const department =
    getDepartment(payroll);

  return (
    payroll?.branch ||
    payroll?.branch_details ||
    employee?.branch ||
    employee?.branch_details ||
    department?.branch ||
    department?.branch_details ||
    null
  );
}

function getCompany(payroll) {
  const employee =
    getEmployee(payroll);

  const department =
    getDepartment(payroll);

  const branch =
    getBranch(payroll);

  return (
    payroll?.company ||
    payroll?.company_details ||
    employee?.company ||
    employee?.company_details ||
    department?.company ||
    department?.company_details ||
    branch?.company ||
    branch?.company_details ||
    null
  );
}

function getEmployeeName(payroll) {
  const employee =
    getEmployee(payroll);

  if (employee) {
    return (
      employee.full_name ||
      employee.employee_name ||
      employee.name ||
      [
        employee.first_name,
        employee.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      `Employee #${
        employee.id ||
        payroll?.employee_id ||
        "-"
      }`
    );
  }

  return `Employee #${
    payroll?.employee_id ??
    "-"
  }`;
}

function getEmployeeCode(payroll) {
  const employee =
    getEmployee(payroll);

  return (
    employee?.employee_code ||
    employee?.employee_id ||
    payroll?.employee_code ||
    payroll?.employee_id ||
    "-"
  );
}

function getCompanyName(payroll) {
  const company =
    getCompany(payroll);

  return (
    company?.name ||
    company?.company_name ||
    payroll?.company_name ||
    "-"
  );
}

function getBranchName(payroll) {
  const branch =
    getBranch(payroll);

  return (
    branch?.name ||
    branch?.branch_name ||
    payroll?.branch_name ||
    "-"
  );
}

function getDepartmentName(
  payroll
) {
  const department =
    getDepartment(payroll);

  return (
    department?.department_name ||
    department?.name ||
    payroll?.department_name ||
    "-"
  );
}

function getDepartmentCode(
  payroll
) {
  const department =
    getDepartment(payroll);

  return (
    department?.department_code ||
    payroll?.department_code ||
    "-"
  );
}

function getCompanyId(payroll) {
  const company =
    getCompany(payroll);

  return (
    company?.id ||
    payroll?.company_id ||
    null
  );
}

function getBranchId(payroll) {
  const branch =
    getBranch(payroll);

  return (
    branch?.id ||
    payroll?.branch_id ||
    null
  );
}

function getDepartmentId(
  payroll
) {
  const department =
    getDepartment(payroll);

  return (
    department?.id ||
    payroll?.department_id ||
    null
  );
}

function normalizeAmount(value) {
  const numeric =
    Number(value);

  return Number.isFinite(
    numeric
  )
    ? numeric
    : 0;
}

function getPayrollStatus(
  payroll
) {
  if (
    payroll?.is_active ===
    false
  ) {
    return "Inactive";
  }

  return (
    payroll?.status ||
    "Pending"
  );
}

function getStatusClass(
  status
) {
  const classes = {
    Pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",

    Paid:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",

    Inactive:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  };

  return (
    classes[status] ||
    classes.Pending
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function statusBadge(
  payroll
) {
  const status =
    getPayrollStatus(
      payroll
    );

  return (
    <Badge
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${getStatusClass(
        status
      )}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "Paid"
            ? "bg-emerald-500"
            : status ===
              "Inactive"
            ? "bg-red-500"
            : "bg-amber-500"
        }`}
      />

      {status}
    </Badge>
  );
}

/* =========================================================
   PERIOD HELPERS
========================================================= */

function formatPayMonth(
  value
) {
  if (!value) {
    return "-";
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})$/
    );

  if (!match) {
    return raw;
  }

  const [
    ,
    year,
    month,
  ] = match;

  const date =
    new Date(
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
   HOVER DETAILS
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

function PayrollDetailsCard({
  payroll,
}) {
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

  const status =
    getPayrollStatus(
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

  return (
    <div className="w-[390px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
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

        {statusBadge(
          payroll
        )}
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Company
          </span>

          <span className="truncate text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {companyName}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Branch
          </span>

          <span className="truncate text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {branchName}
          </span>
        </div>

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Department
          </span>

          <span className="truncate text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {departmentName}
          </span>
        </div>

        {departmentCode !==
          "-" && (
          <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
            <span className="text-xs text-slate-400">
              Dept. Code
            </span>

            <span className="text-right font-mono text-[10px] font-medium text-slate-700 dark:text-slate-200">
              {departmentCode}
            </span>
          </div>
        )}

        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">
            Pay Month
          </span>

          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatPayMonth(
              payroll?.pay_month
            )}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
          <p className="text-[9px] uppercase tracking-wide text-slate-400">
            Gross
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(
              gross
            )}
          </p>
        </div>

        <div className="rounded-lg bg-red-50/70 p-2 dark:bg-red-500/5">
          <p className="text-[9px] uppercase tracking-wide text-red-400">
            Deductions
          </p>

          <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-300">
            {formatCurrency(
              deductions
            )}
          </p>
        </div>

        <div className="rounded-lg bg-emerald-50/70 p-2 dark:bg-emerald-500/5">
          <p className="text-[9px] uppercase tracking-wide text-emerald-500">
            Net
          </p>

          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            {formatCurrency(
              net
            )}
          </p>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">
            Employee ID
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
            #
            {payroll?.employee_id ??
              "-"}
          </p>
        </div>

        <div>
          <p className="text-[10px] text-slate-400">
            Payroll ID
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
            #
            {payroll?.id ??
              "-"}
          </p>
        </div>
      </div>
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
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 4h14v16H5z"
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
      d="M12 7v10M15 9c-.5-1-1.5-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 .9 3 2.3-1.3 2.3-3 2.3c-1.5 0-2.6-.5-3.2-1.5"
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

const EmployeeIcon = () => (
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
      d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
    />

    <circle
      cx="9"
      cy="7"
      r="4"
    />

    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
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

    red:
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
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
  const {
    showToast,
  } = useToast();

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
     MASTER FILTER DATA
  ======================================================= */

  const {
    data: companyData,
  } = useCompanies({
    page: 1,
    per_page: 100,
    is_active: true,
  });

  const {
    data: branchData,
  } = useCompanyBranches(
    companyFilterId,
    {
      page: 1,
      per_page: 100,
      is_active: true,
    }
  );

  const {
    data: departmentData,
  } = useQuery({
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
        response?.data
          ?.data ||
        response?.data ||
        {}
      );
    },

    enabled:
      !!branchFilterId,
  });

  const filterCompanies =
    companyData?.items ||
    companyData?.data ||
    [];

  const filterBranches =
    branchData?.items ||
    branchData?.data ||
    [];

  const filterDepartments =
    departmentData?.items ||
    departmentData?.data ||
    [];

  /* =======================================================
     PAYROLL DATA
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

  const allPayroll =
    data?.items ||
    data?.data ||
    [];

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

  const {
    exporting,
    exportExcel,
    exportPDF,
  } = useTableExport({
    fetchAll:
      employeeLifecycleApi
        .payroll.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename:
      "payroll",

    title:
      "Payroll Records",
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
      setEmployeeFilterId("");

      setPage(1);
    };

  const handleBranchFilterChange =
    (event) => {
      setBranchFilterId(
        event.target.value
      );

      setDepartmentFilterId("");
      setEmployeeFilterId("");

      setPage(1);
    };

  const handleDepartmentFilterChange =
    (event) => {
      setDepartmentFilterId(
        event.target.value
      );

      setEmployeeFilterId("");

      setPage(1);
    };

  /* =======================================================
     UNIQUE EMPLOYEES
  ======================================================= */

  const employeeOptions =
    useMemo(() => {
      const map =
        new Map();

      allPayroll.forEach(
        (payroll) => {
          const employeeId =
            payroll?.employee_id;

          if (!employeeId) {
            return;
          }

          if (
            !map.has(
              String(
                employeeId
              )
            )
          ) {
            map.set(
              String(
                employeeId
              ),
              {
                value:
                  employeeId,
                label:
                  getEmployeeName(
                    payroll
                  ),
              }
            );
          }
        }
      );

      return [
        ...map.values(),
      ].sort((a, b) =>
        String(
          a.label
        ).localeCompare(
          String(
            b.label
          )
        )
      );
    }, [allPayroll]);

  /* =======================================================
     FILTERED PAYROLL
  ======================================================= */

  const filteredPayroll =
    useMemo(() => {
      return allPayroll.filter(
        (payroll) => {
          const isActive =
            payroll.is_active !==
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
            employeeFilterId &&
            String(
              payroll.employee_id
            ) !==
              String(
                employeeFilterId
              )
          ) {
            return false;
          }

          return true;
        }
      );
    }, [
      allPayroll,
      statusFilter,
      companyFilterId,
      branchFilterId,
      departmentFilterId,
      employeeFilterId,
    ]);

  /* =======================================================
     CLIENT SEARCH
  ======================================================= */

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const searchedPayroll =
    useMemo(() => {
      if (
        !normalizedSearch
      ) {
        return filteredPayroll;
      }

      return filteredPayroll.filter(
        (payroll) => {
          const haystack = [
            payroll.id,
            payroll.employee_id,
            getEmployeeName(
              payroll
            ),
            getEmployeeCode(
              payroll
            ),
            getCompanyName(
              payroll
            ),
            getBranchName(
              payroll
            ),
            getDepartmentName(
              payroll
            ),
            payroll.pay_month,
            payroll.status,
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            normalizedSearch
          );
        }
      );
    }, [
      filteredPayroll,
      normalizedSearch,
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
        searchedPayroll.length /
          pageSize
      )
    );

  const pagedPayroll =
    searchedPayroll.slice(
      (page - 1) *
        pageSize,
      page * pageSize
    );

  /* =======================================================
     STATISTICS
  ======================================================= */

  const activePayroll =
    allPayroll.filter(
      (item) =>
        item.is_active !==
        false
    );

  const inactivePayroll =
    allPayroll.filter(
      (item) =>
        item.is_active ===
        false
    );

  const paidPayroll =
    activePayroll.filter(
      (item) =>
        String(
          item.status
        ).toLowerCase() ===
        "paid"
    );

  const pendingPayroll =
    activePayroll.filter(
      (item) =>
        String(
          item.status
        ).toLowerCase() !==
        "paid"
    );

  const totalGross =
    activePayroll.reduce(
      (sum, item) =>
        sum +
        normalizeAmount(
          item.gross_salary
        ),
      0
    );

  const totalNet =
    activePayroll.reduce(
      (sum, item) =>
        sum +
        normalizeAmount(
          item.net_salary
        ),
      0
    );

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleAdd = () => {
    setSelectedPayroll(null);
    setModalOpen(true);
  };

  const handleEdit = (
    payroll
  ) => {
    setSelectedPayroll(
      payroll
    );

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
        if (
          selectedPayroll
        ) {
          await updatePayroll.mutateAsync(
            {
              id:
                selectedPayroll.id,
              payload,
            }
          );

          showToast(
            "Payroll record updated successfully",
            "success"
          );
        } else {
          await createPayroll.mutateAsync(
            payload
          );

          showToast(
            "Payroll record created successfully",
            "success"
          );
        }

        handleCloseModal();
        refetch();
      } catch (err) {
        showToast(
          err?.response
            ?.data?.message ||
            err?.message ||
            "Operation failed",
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
      if (
        !payrollToDelete
      ) {
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

        setPayrollToDelete(
          null
        );

        refetch();
      } catch (err) {
        showToast(
          err?.response
            ?.data?.message ||
            err?.message ||
            "Operation failed",
          "error"
        );
      }
    };

  const handleReactivate =
    async (payroll) => {
      try {
        await updatePayroll.mutateAsync(
          {
            id:
              payroll.id,
            payload: {
              is_active:
                true,
            },
          }
        );

        showToast(
          "Payroll record reactivated successfully",
          "success"
        );

        refetch();
      } catch (err) {
        showToast(
          err?.response
            ?.data?.message ||
            err?.message ||
            "Operation failed",
          "error"
        );
      }
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
            {error?.response
              ?.data?.message ||
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
    <div className="space-y-5">
      {/* ===================================================
          HEADER
      =================================================== */}

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
            onRefresh={
              refetch
            }
            refreshing={
              isFetching
            }
            onExportExcel={
              exportExcel
            }
            onExportPDF={
              exportPDF
            }
            exporting={
              exporting
            }
          />

          <Button
            type="button"
            onClick={
              handleAdd
            }
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>

            Add Payroll
          </Button>
        </div>
      </div>

      {/* ===================================================
          STAT CARDS
      =================================================== */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={
            <PayrollIcon />
          }
          value={
            allPayroll.length
          }
          label="Total Payroll Records"
          caption="All payroll periods"
          tone="primary"
        />

        <StatCard
          icon={
            <PaidIcon />
          }
          value={
            paidPayroll.length
          }
          label="Paid Payroll"
          caption="Completed payroll"
          tone="emerald"
        />

        <StatCard
          icon={
            <PendingIcon />
          }
          value={
            pendingPayroll.length
          }
          label="Pending Payroll"
          caption="Awaiting payment"
          tone="amber"
        />

        <StatCard
          icon={
            <MoneyIcon />
          }
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

      {/* ===================================================
          HIERARCHY FILTER BAR
      =================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col gap-2.5 sm:flex-row xl:max-w-5xl">
            {/* SEARCH */}

            <div className="relative w-full sm:max-w-xs">
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
                value={
                  search
                }
                onChange={(
                  event
                ) => {
                  setSearch(
                    event.target
                      .value
                  );

                  setPage(
                    1
                  );
                }}
                placeholder="Search employee, month..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* COMPANY */}

            <div className="relative w-full">
              <select
                value={
                  companyFilterId
                }
                onChange={
                  handleCompanyFilterChange
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">
                  All Companies
                </option>

                {filterCompanies.map(
                  (
                    company
                  ) => (
                    <option
                      key={
                        company.id
                      }
                      value={
                        company.id
                      }
                    >
                      {company.name ||
                        company.company_name}
                    </option>
                  )
                )}
              </select>

              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <CompanyIcon />
              </span>
            </div>

            {/* BRANCH */}

            <div className="relative w-full">
              <select
                value={
                  branchFilterId
                }
                onChange={
                  handleBranchFilterChange
                }
                disabled={
                  !companyFilterId
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">
                  {companyFilterId
                    ? "All Branches"
                    : "Select company first"}
                </option>

                {filterBranches.map(
                  (
                    branch
                  ) => (
                    <option
                      key={
                        branch.id
                      }
                      value={
                        branch.id
                      }
                    >
                      {branch.name ||
                        branch.branch_name}
                    </option>
                  )
                )}
              </select>

              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <BranchIcon />
              </span>
            </div>

            {/* DEPARTMENT */}

            <div className="relative w-full">
              <select
                value={
                  departmentFilterId
                }
                onChange={
                  handleDepartmentFilterChange
                }
                disabled={
                  !branchFilterId
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">
                  {branchFilterId
                    ? "All Departments"
                    : "Select branch first"}
                </option>

                {filterDepartments.map(
                  (
                    department
                  ) => (
                    <option
                      key={
                        department.id
                      }
                      value={
                        department.id
                      }
                    >
                      {
                        department.department_name
                      }
                    </option>
                  )
                )}
              </select>

              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <DepartmentIcon />
              </span>
            </div>

            {/* EMPLOYEE */}

            <div className="relative w-full">
              <select
                value={
                  employeeFilterId
                }
                onChange={(
                  event
                ) => {
                  setEmployeeFilterId(
                    event.target
                      .value
                  );

                  setPage(
                    1
                  );
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">
                  All Employees
                </option>

                {employeeOptions.map(
                  (
                    employee
                  ) => (
                    <option
                      key={
                        employee.value
                      }
                      value={
                        employee.value
                      }
                    >
                      {
                        employee.label
                      }
                    </option>
                  )
                )}
              </select>

              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <EmployeeIcon />
              </span>
            </div>
          </div>

          {/* VIEW + STATUS */}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() =>
                  setViewMode(
                    "table"
                  )
                }
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
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
                onClick={() =>
                  setViewMode(
                    "card"
                  )
                }
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode ===
                  "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Card
              </button>
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[
                "active",
                "inactive",
                "all",
              ].map(
                (status) => (
                  <button
                    key={
                      status
                    }
                    type="button"
                    onClick={() => {
                      setStatusFilter(
                        status
                      );

                      setPage(
                        1
                      );
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
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
        </div>

        {/* ACTIVE HIERARCHY */}
        {(companyFilterId ||
          branchFilterId ||
          departmentFilterId ||
          employeeFilterId ||
          search) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Current scope:
            </span>

            {companyFilterId && (
              <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                Company
              </span>
            )}

            {branchFilterId && (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                Branch
              </span>
            )}

            {departmentFilterId && (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                Department
              </span>
            )}

            {employeeFilterId && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                Employee
              </span>
            )}
          </div>
        )}
      </div>

      {/* ===================================================
          LOADING
      =================================================== */}

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from(
            {
              length: 6,
            }
          ).map(
            (_, index) => (
              <div
                key={index}
                className="h-[365px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            )
          )}
        </div>
      )}

      {/* ===================================================
          TABLE VIEW
      =================================================== */}

      {!isLoading &&
        viewMode ===
          "table" &&
        pagedPayroll.length >
          0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Employee
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Organization
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
                  (
                    payroll
                  ) => {
                    const firstLetter =
                      getEmployeeName(
                        payroll
                      )
                        .charAt(
                          0
                        )
                        .toUpperCase() ||
                      "E";

                    return (
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
                                {
                                  firstLetter
                                }
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                                  {
                                    getEmployeeName(
                                      payroll
                                    )
                                  }
                                </p>

                                <p className="font-mono text-[10px] text-slate-400">
                                  {
                                    getEmployeeCode(
                                      payroll
                                    )
                                  }
                                </p>
                              </div>
                            </div>
                          </HoverDetailsTrigger>
                        </td>

                        {/* ORGANIZATION */}

                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {
                                getCompanyName(
                                  payroll
                                )
                              }
                            </p>

                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {
                                getBranchName(
                                  payroll
                                )
                              }
                            </p>

                            <p className="text-[10px] text-primary-600 dark:text-primary-400">
                              {
                                getDepartmentName(
                                  payroll
                                )
                              }
                            </p>
                          </div>
                        </td>

                        {/* PAY MONTH */}

                        <td className="px-4 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {formatPayMonth(
                              payroll.pay_month
                            )}
                          </span>
                        </td>

                        {/* GROSS */}

                        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {formatCurrency(
                            payroll.gross_salary
                          )}
                        </td>

                        {/* DEDUCTIONS */}

                        <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(
                            payroll.deductions
                          )}
                        </td>

                        {/* NET */}

                        <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(
                            payroll.net_salary
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

                            {payroll.is_active !==
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
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

      {/* ===================================================
          CARD VIEW
      =================================================== */}

      {!isLoading &&
        viewMode ===
          "card" &&
        pagedPayroll.length >
          0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pagedPayroll.map(
              (
                payroll
              ) => {
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

                const gross =
                  normalizeAmount(
                    payroll.gross_salary
                  );

                const deductions =
                  normalizeAmount(
                    payroll.deductions
                  );

                const net =
                  normalizeAmount(
                    payroll.net_salary
                  );

                const isActive =
                  payroll.is_active !==
                  false;

                const firstLetter =
                  employeeName
                    .charAt(
                      0
                    )
                    .toUpperCase() ||
                  "E";

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

                    {/* CARD CONTENT */}

                    <div className="p-4">
                      {/* TOP */}

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
                              {
                                firstLetter
                              }
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
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            <CompanyIcon />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Company
                            </p>

                            <p
                              title={
                                companyName
                              }
                              className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                            >
                              {
                                companyName
                              }
                            </p>
                          </div>
                        </div>

                        <div className="ml-3.5 border-l border-dashed border-slate-200 pl-4 dark:border-slate-700">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                <BranchIcon />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                                  Branch
                                </p>

                                <p
                                  title={
                                    branchName
                                  }
                                  className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200"
                                >
                                  {
                                    branchName
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="ml-3.5 border-l border-dashed border-slate-200 pl-4 dark:border-slate-700">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                  <DepartmentIcon />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                                    Department
                                  </p>

                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <p
                                      title={
                                        departmentName
                                      }
                                      className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                                    >
                                      {
                                        departmentName
                                      }
                                    </p>

                                    {departmentCode !==
                                      "-" && (
                                      <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[8px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        {
                                          departmentCode
                                        }
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 ml-3.5 border-l border-dashed border-primary-200 pl-4 dark:border-primary-500/20">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                                    <EmployeeIcon />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                                      Employee
                                    </p>

                                    <p className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                      {
                                        employeeName
                                      }
                                    </p>
                                  </div>
                                </div>
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
                                payroll.pay_month
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm dark:bg-slate-900">
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Payroll ID
                            </p>

                            <p className="text-right text-[10px] font-bold text-primary-600 dark:text-primary-400">
                              #
                              {
                                payroll.id
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                              Gross
                            </p>

                            <p className="mt-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                              {formatCurrency(
                                gross
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-red-400">
                              Deductions
                            </p>

                            <p className="mt-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(
                                deductions
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-medium uppercase tracking-wide text-emerald-500">
                              Net
                            </p>

                            <p className="mt-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(
                                net
                              )}
                            </p>
                          </div>
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
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition-all hover:border-primary-200 hover:bg-primary-50 hover:text-primary-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-400"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z"
                            />

                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6"
                            />
                          </svg>

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
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-500/10"
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
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-emerald-600 transition-all hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/40 dark:bg-slate-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>

                    {/* STATUS FOOTER */}

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
              })}
          </div>
        )}

      {/* ===================================================
          EMPTY
      =================================================== */}

      {!isLoading &&
        searchedPayroll.length ===
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
              your current hierarchy,
              employee, search, or
              status filters.
            </p>

            <Button
              onClick={
                handleAdd
              }
              className="mt-4 h-9 px-4 text-sm"
            >
              + Add Payroll
            </Button>
          </div>
        )}

      {/* ===================================================
          PAGINATION
      =================================================== */}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        <span>
          Page {page} of{" "}
          {pageCount}
        </span>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={
              page <= 1
            }
            onClick={() =>
              setPage(
                (
                  current
                ) =>
                  Math.max(
                    1,
                    current -
                      1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >=
              pageCount
            }
            onClick={() =>
              setPage(
                (
                  current
                ) =>
                  Math.min(
                    pageCount,
                    current +
                      1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* ===================================================
          EDIT / ADD MODAL
      =================================================== */}

      <Modal
        open={
          modalOpen
        }
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
          initialData={
            selectedPayroll ||
            {}
          }
          isEdit={
            !!selectedPayroll
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

      {/* ===================================================
          DEACTIVATE
      =================================================== */}

      <ConfirmDialog
        open={
          !!payrollToDelete
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
                payrollToDelete.pay_month
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