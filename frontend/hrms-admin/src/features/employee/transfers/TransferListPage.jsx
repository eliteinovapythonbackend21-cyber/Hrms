import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

import { employeeLifecycleApi } from "@/api/employee.api";
import { employeesApi } from "@/api/employees.api";

import { useCompanies } from "@/features/master/company/useCompanies";

import {
  useDepartmentOptions,
  useDesignationOptions,
} from "@/hooks/useLookupOptions";

import TransferForm from "./TransferForm";

import {
  useTransfers,
  useCreateTransfer,
  useUpdateTransfer,
  useDeactivateTransfer,
} from "./useTransfers";

import { formatDate } from "@/utils/formatDate";

/* =========================================================
   CONSTANTS
========================================================= */

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

const EXPORT_COLUMNS = [
  {
    key: "employee_id",
    label: "Employee ID",
  },
  {
    key: "from_department_id",
    label: "Current Department",
  },
  {
    key: "to_department_id",
    label: "Transfer Department",
  },
  {
    key: "location",
    label: "Location",
  },
  {
    key: "transfer_apply_date",
    label: "Transfer Apply Date",
  },
  {
    key: "relieving_date",
    label: "Relieving Date",
  },
  {
    key: "joining_date",
    label: "Joining Date",
  },
  {
    key: "transfer_reason",
    label: "Transfer Reason",
  },
  {
    key: "accomplishments",
    label: "Overall Records / Accomplishments",
  },
  {
    key: "is_active",
    label: "Active",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getEmployeeName(employee) {
  if (!employee) {
    return "";
  }

  return (
    `${employee.first_name || ""} ${
      employee.last_name || ""
    }`.trim() ||
    employee.employee_code ||
    ""
  );
}

function getDepartmentName(
  department,
  fallback = "—"
) {
  return (
    department?.department_name ||
    department?.name ||
    fallback
  );
}

function getTransferLocation(
  transfer
) {
  /*
   * IMPORTANT:
   *
   * Transfer location MUST come from
   * the transfer table.
   *
   * Never use employee.location here.
   */
  return (
    String(
      transfer?.location || ""
    ).trim() || "—"
  );
}

function getAccomplishments(
  transfer
) {
  return String(
    transfer?.accomplishments ||
      ""
  ).trim();
}

function getTransferReason(
  transfer
) {
  return String(
    transfer?.transfer_reason ||
      transfer?.reason ||
      ""
  ).trim();
}

/* =========================================================
   ICONS
========================================================= */

const TransferIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7h10m0 0-3-3m3 3-3 3M17 17H7m0 0 3 3m-3-3 3-3"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect
      x="3"
      y="4.5"
      width="18"
      height="16"
      rx="2"
    />

    <path
      strokeLinecap="round"
      d="M3 9h18M8 3v3M16 3v3"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H4v-1a4 4 0 013-3.87m5-3a4 4 0 100-8 4 4 0 000 8zm7 3a4 4 0 10-8 0"
    />
  </svg>
);

const ArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5l7 7-7 7"
    />
  </svg>
);

const SmallCalendarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <rect
      x="3"
      y="4.5"
      width="18"
      height="16"
      rx="2"
    />

    <path
      strokeLinecap="round"
      d="M3 9h18M8 3v3M16 3v3"
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
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
          {icon}
        </div>

        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DEPARTMENT BADGE
========================================================= */

function DepartmentBadge({
  label,
  tone = "from",
}) {
  const tones = {
    from:
      "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/20",

    to:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30",
  };

  const dots = {
    from:
      "bg-slate-400 dark:bg-slate-500",

    to: "bg-sky-500",
  };

  return (
    <span
      title={label}
      className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[tone]}`}
      />

      <span className="max-w-[180px] truncate">
        {label}
      </span>
    </span>
  );
}

/* =========================================================
   DEPARTMENT DETAILS CARD
========================================================= */

function DepartmentDetailsCard({
  roleLabel,
  tone,
  department,
  departmentFallback,
  employeeName,
  employeeCode,
  location,
  transferReason,
  transferApplyDate,
  relievingDate,
  joiningDate,
  accomplishments,
  isActive,
}) {
  const accentTones = {
    from:
      "border-t-slate-400 dark:border-t-slate-500",

    to:
      "border-t-sky-500 dark:border-t-sky-400",
  };

  const departmentName =
    getDepartmentName(
      department,
      departmentFallback
    );

  return (
    <div
      className={`w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800 ${accentTones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {roleLabel}
          </p>

          <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-800 dark:text-white">
            {departmentName}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {isActive
            ? "Active"
            : "Inactive"}
        </span>
      </div>

      {department?.description && (
        <>
          <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Description
            </p>

            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
              {department.description}
            </p>
          </div>
        </>
      )}

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Employee
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {employeeName}

            {employeeCode
              ? ` (${employeeCode})`
              : ""}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Location
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {location || "—"}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Transfer Reason
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {transferReason ||
              "Other"}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Apply Date
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {formatDate(
              transferApplyDate
            )}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Relieving Date
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {formatDate(
              relievingDate
            )}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Joining Date
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {formatDate(
              joiningDate
            )}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Overall Records / Accomplishments
        </p>

        <p className="max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
          {accomplishments ||
            "—"}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER
========================================================= */

function DepartmentHoverTrigger({
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
      className="group/department relative inline-flex max-w-full outline-none"
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
          group-hover/department:pointer-events-auto
          group-hover/department:visible
          group-hover/department:opacity-100
          group-focus/department:pointer-events-auto
          group-focus/department:visible
          group-focus/department:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

/* =========================================================
   ACCOMPLISHMENTS HOVER CARD
========================================================= */

function AccomplishmentsHoverCard({
  accomplishments,
}) {
  return (
    <div className="w-[340px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Overall Records / Accomplishments
      </p>

      <div className="mt-2 max-h-[220px] overflow-y-auto">
        <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
          {accomplishments ||
            "No accomplishments recorded."}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   ACCOMPLISHMENTS PREVIEW
========================================================= */

function AccomplishmentsPreview({
  accomplishments,
}) {
  const value =
    accomplishments || "";

  if (!value) {
    return (
      <span className="text-xs text-slate-300 dark:text-slate-600">
        —
      </span>
    );
  }

  return (
    <DepartmentHoverTrigger
      align="right"
      panel={
        <AccomplishmentsHoverCard
          accomplishments={
            value
          }
        />
      }
    >
      <p
        title={value}
        className="line-clamp-2 max-w-full cursor-pointer whitespace-normal break-words text-xs leading-4 text-slate-600 dark:text-slate-300"
      >
        {value}
      </p>
    </DepartmentHoverTrigger>
  );
}

/* =========================================================
   REASON BADGE
========================================================= */

function ReasonBadge({
  reason,
}) {
  return (
    <span
      title={
        reason || "Other"
      }
      className="inline-flex max-w-full items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30"
    >
      <span className="max-w-[180px] truncate">
        {reason ||
          "Other"}
      </span>
    </span>
  );
}

/* =========================================================
   TABLE ICON BUTTON
========================================================= */

const TableIconButton = ({
  onClick,
  title,
  disabled,
  tone = "primary",
  children,
}) => {
  const tones = {
    primary:
      "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10",

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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function TransferListPage() {
  const { showToast } =
    useToast();

  /* =======================================================
     TRANSFERS
  ======================================================= */

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useTransfers({
    page: 1,
    per_page: 1000,
  });

  const allTransfers =
    allData?.items || [];

  /* =======================================================
     EMPLOYEES
  ======================================================= */

  const {
    data: employeesData,
  } = useQuery({
    queryKey: [
      "transfers-page",
      "employees-full",
    ],

    queryFn: async () =>
      (
        await employeesApi.list({
          page: 1,
          per_page: 1000,
          is_active: true,
        })
      ).data.data,
  });

  const employees =
    employeesData?.items || [];

  const employeeMap =
    useMemo(
      () =>
        Object.fromEntries(
          employees.map(
            (employee) => [
              employee.id,
              employee,
            ]
          )
        ),
      [employees]
    );

  /* =======================================================
     COMPANIES
  ======================================================= */

  const {
    data: companyData,
  } = useCompanies({
    page: 1,
    per_page: 1000,
  });

  const companies =
    companyData?.items ||
    companyData?.data ||
    [];

  /* =======================================================
     DEPARTMENT OPTIONS
  ======================================================= */

  const departmentOptions =
    useDepartmentOptions();

  /* =======================================================
     DESIGNATION OPTIONS
  ======================================================= */

  const designationOptions =
    useDesignationOptions();

  /* =======================================================
     FILTER STATES
  ======================================================= */

  const [
    filterCompanyId,
    setFilterCompanyId,
  ] = useState("");

  const [
    filterBranchId,
    setFilterBranchId,
  ] = useState("");

  const [
    filterDepartmentId,
    setFilterDepartmentId,
  ] = useState("");

  const [
    filterDesignationId,
    setFilterDesignationId,
  ] = useState("");

  const [
    filterReason,
    setFilterReason,
  ] = useState("");

  /* =======================================================
     BRANCH OPTIONS
  ======================================================= */

  const branches =
    useMemo(() => {
      const map = new Map();

      employees.forEach(
        (employee) => {
          const branch =
            employee?.department
              ?.branch ||
            employee?.branch;

          if (!branch?.id) {
            return;
          }

          const company =
            employee
              ?.department?.company ||
            employee?.company;

          if (
            filterCompanyId &&
            String(
              company?.id
            ) !==
              String(
                filterCompanyId
              )
          ) {
            return;
          }

          map.set(
            branch.id,
            branch
          );
        }
      );

      companies.forEach(
        (company) => {
          if (
            filterCompanyId &&
            String(
              company.id
            ) !==
              String(
                filterCompanyId
              )
          ) {
            return;
          }

          (
            company?.branches ||
            []
          ).forEach(
            (branch) => {
              if (branch?.id) {
                map.set(
                  branch.id,
                  branch
                );
              }
            }
          );
        }
      );

      return Array.from(
        map.values()
      ).sort((a, b) =>
        (
          a.name ||
          a.branch_name ||
          ""
        ).localeCompare(
          b.name ||
            b.branch_name ||
            ""
        )
      );
    }, [
      employees,
      companies,
      filterCompanyId,
    ]);

  /* =======================================================
     REASONS
  ======================================================= */

  const reasonOptions =
    useMemo(() => {
      const reasons =
        new Set();

      allTransfers.forEach(
        (transfer) => {
          const reason =
            getTransferReason(
              transfer
            );

          if (reason) {
            reasons.add(
              reason
            );
          }
        }
      );

      [
        "Business Requirement",
        "Department Requirement",
        "Employee Request",
        "Promotion / Career Growth",
        "Role Change",
        "Project Requirement",
        "Branch Requirement",
        "Relocation",
        "Performance",
        "Organizational Restructuring",
        "Other",
      ].forEach(
        (reason) =>
          reasons.add(
            reason
          )
      );

      return Array.from(
        reasons
      ).sort();
    }, [allTransfers]);

  /* =======================================================
     MUTATIONS
  ======================================================= */

  const createMutation =
    useCreateTransfer();

  const updateMutation =
    useUpdateTransfer();

  const deactivateMutation =
    useDeactivateTransfer();

  /* =======================================================
     PAGE STATES
  ======================================================= */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("active");

  const [
    viewMode,
    setViewMode,
  ] = useState("table");

  const [page, setPage] =
    useState(1);

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [editing, setEditing] =
    useState(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState(null);

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
        .transfers.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename: "transfers",

    title: "Transfers",
  });

  /* =======================================================
     ACTIVE TRANSFERS
  ======================================================= */

  const activeTransfers =
    allTransfers.filter(
      (transfer) =>
        transfer.is_active !==
        false
    );

  /* =======================================================
     STATISTICS
  ======================================================= */

  const thisMonthCount =
    useMemo(() => {
      const now =
        new Date();

      return activeTransfers
        .filter(
          (transfer) => {
            if (
              !transfer.transfer_apply_date
            ) {
              return false;
            }

            const date =
              new Date(
                transfer.transfer_apply_date
              );

            return (
              date.getMonth() ===
                now.getMonth() &&
              date.getFullYear() ===
                now.getFullYear()
            );
          }
        ).length;
    }, [activeTransfers]);

  const uniqueEmployeeCount =
    useMemo(
      () =>
        new Set(
          activeTransfers.map(
            (transfer) =>
              transfer.employee_id
          )
        ).size,
      [activeTransfers]
    );

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return allTransfers
        .filter(
          (transfer) => {
            /* STATUS */

            if (
              statusFilter ===
                "active" &&
              transfer.is_active ===
                false
            ) {
              return false;
            }

            if (
              statusFilter ===
                "inactive" &&
              transfer.is_active !==
                false
            ) {
              return false;
            }

            const employee =
              employeeMap[
                transfer.employee_id
              ];

            /* COMPANY */

            const employeeCompany =
              employee
                ?.department
                ?.company ||
              employee?.company;

            if (
              filterCompanyId &&
              String(
                employeeCompany?.id
              ) !==
                String(
                  filterCompanyId
                )
            ) {
              return false;
            }

            /* BRANCH */

            const employeeBranch =
              employee
                ?.department
                ?.branch ||
              employee?.branch;

            if (
              filterBranchId &&
              String(
                employeeBranch?.id
              ) !==
                String(
                  filterBranchId
                )
            ) {
              return false;
            }

            /* DEPARTMENT */

            const employeeDepartment =
              employee?.department;

            if (
              filterDepartmentId &&
              String(
                employeeDepartment?.id
              ) !==
                String(
                  filterDepartmentId
                )
            ) {
              return false;
            }

            /* DESIGNATION */

            const employeeDesignationId =
              employee
                ?.designation?.id ||
              employee
                ?.designation_id;

            if (
              filterDesignationId &&
              String(
                employeeDesignationId
              ) !==
                String(
                  filterDesignationId
                )
            ) {
              return false;
            }

            /* REASON */

            const transferReason =
              getTransferReason(
                transfer
              ) ||
              "Other";

            if (
              filterReason &&
              String(
                transferReason
              ) !==
                String(
                  filterReason
                )
            ) {
              return false;
            }

            /* SEARCH */

            if (
              normalizedSearch
            ) {
              const employeeName =
                employee
                  ? `${employee.first_name || ""} ${
                      employee.last_name || ""
                    }`
                  : "";

              const employeeCode =
                employee?.employee_code ||
                "";

              const fromDepartment =
                getDepartmentName(
                  transfer.from_department,
                  ""
                );

              const toDepartment =
                getDepartmentName(
                  transfer.to_department,
                  ""
                );

              /*
               * Transfer location ONLY.
               */
              const location =
                transfer.location ||
                "";

              const accomplishments =
                getAccomplishments(
                  transfer
                );

              const haystack = [
                employeeName,
                employeeCode,
                fromDepartment,
                toDepartment,
                transferReason,
                location,
                accomplishments,
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
        )
        .sort(
          (a, b) =>
            new Date(
              b.transfer_apply_date
            ) -
            new Date(
              a.transfer_apply_date
            )
        );
    }, [
      allTransfers,
      employeeMap,
      search,
      statusFilter,
      filterCompanyId,
      filterBranchId,
      filterDepartmentId,
      filterDesignationId,
      filterReason,
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
        filtered.length /
          pageSize
      )
    );

  const paged =
    filtered.slice(
      (page - 1) *
        pageSize,
      page *
        pageSize
    );

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (
    transfer
  ) => {
    /*
     * Pass the full transfer object,
     * including transfer-specific
     * location and dates.
     */
    setEditing({
      ...transfer,

      employee_id:
        transfer.employee_id ||
        transfer.employee?.id ||
        "",

      from_department_id:
        transfer.from_department_id ||
        transfer.from_department?.id ||
        "",

      to_department_id:
        transfer.to_department_id ||
        transfer.to_department?.id ||
        "",

      location:
        transfer.location || "",

      transfer_apply_date:
        transfer.transfer_apply_date ||
        "",

      joining_date:
        transfer.joining_date ||
        "",

      relieving_date:
        transfer.relieving_date ||
        "",

      transfer_reason:
        transfer.transfer_reason ||
        "Other",

      accomplishments:
        transfer.accomplishments ||
        "",

      is_active:
        transfer.is_active !==
        false,
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async (payload) => {
      try {
        const normalizedPayload =
          {
            ...payload,

            employee_id:
              payload.employee_id
                ? Number(
                    payload.employee_id
                  )
                : payload.employee_id,

            from_department_id:
              payload.from_department_id
                ? Number(
                    payload.from_department_id
                  )
                : null,

            to_department_id:
              payload.to_department_id
                ? Number(
                    payload.to_department_id
                  )
                : payload.to_department_id,

            transfer_reason:
              payload.transfer_reason ||
              "Other",

            transfer_apply_date:
              payload.transfer_apply_date ||
              "",

            joining_date:
              payload.joining_date ||
              "",

            relieving_date:
              payload.relieving_date ||
              "",

            /*
             * Transfer location.
             */
            location:
              payload.location?.trim() ||
              "",

            accomplishments:
              payload.accomplishments?.trim() ||
              null,

            is_active:
              payload.is_active !==
              false,
          };

        /*
         * Explicitly remove old field.
         */
        delete normalizedPayload.effective_date;

        /*
         * Explicitly remove old field.
         */
        delete normalizedPayload.remarks;

        /*
         * Explicitly remove old fallback.
         */
        delete normalizedPayload.reason;

        if (editing) {
          await updateMutation.mutateAsync(
            {
              id: editing.id,

              payload:
                normalizedPayload,
            }
          );

          showToast(
            "Transfer updated successfully",
            "success"
          );
        } else {
          await createMutation.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Transfer created successfully",
            "success"
          );
        }

        closeModal();

        await refetch();
      } catch (err) {
        showToast(
          err?.response?.data
            ?.message ||
            "Operation failed",
          "error"
        );
      }
    };

  /* =======================================================
     DELETE
  ======================================================= */

  const confirmDelete =
    async () => {
      if (!deleteTarget) {
        return;
      }

      try {
        await deactivateMutation.mutateAsync(
          deleteTarget.id
        );

        showToast(
          "Transfer deactivated",
          "success"
        );

        setDeleteTarget(
          null
        );

        await refetch();
      } catch (err) {
        showToast(
          err?.response?.data
            ?.message ||
            "Operation failed",
          "error"
        );
      }
    };

  /* =======================================================
     REACTIVATE
  ======================================================= */

  const handleReactivate =
    async (
      transfer
    ) => {
      try {
        await updateMutation.mutateAsync(
          {
            id: transfer.id,

            payload: {
              is_active: true,
            },
          }
        );

        showToast(
          "Transfer reactivated",
          "success"
        );

        await refetch();
      } catch (err) {
        showToast(
          err?.response?.data
            ?.message ||
            "Operation failed",
          "error"
        );
      }
    };

  /* =======================================================
     EXPORT
  ======================================================= */

  /*
   * Export is handled by useTableExport.
   * The columns use the new transfer date fields.
   */

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const clearFilters = () => {
    setSearch("");
    setFilterCompanyId("");
    setFilterBranchId("");
    setFilterDepartmentId("");
    setFilterDesignationId("");
    setFilterReason("");
    setStatusFilter("active");
    setPage(1);
  };

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending;

  /* =======================================================
     ERROR
  ======================================================= */

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load transfers.
      </div>
    );
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-w-0 space-y-5">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transfers
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Employee transfer history
          </p>
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

            Add Transfer
          </Button>
        </div>
      </div>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={
            <TransferIcon />
          }
          value={
            activeTransfers.length
          }
          label="Total Transfers"
        />

        <StatCard
          icon={
            <CalendarIcon />
          }
          value={
            thisMonthCount
          }
          label="This Month"
        />

        <StatCard
          icon={
            <UsersIcon />
          }
          value={
            uniqueEmployeeCount
          }
          label="Employees Transferred"
        />
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
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
                    event.target.value
                  );

                  setPage(
                    1
                  );
                }}
                placeholder="Search employee, department, reason..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* COMPANY */}

            <select
              value={
                filterCompanyId
              }
              onChange={(
                event
              ) => {
                setFilterCompanyId(
                  event.target.value
                );

                setFilterBranchId(
                  ""
                );

                setPage(
                  1
                );
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Companies
              </option>

              {companies.map(
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
                      company.company_name ||
                      `Company #${company.id}`}
                  </option>
                )
              )}
            </select>

            {/* BRANCH */}

            <select
              value={
                filterBranchId
              }
              onChange={(
                event
              ) => {
                setFilterBranchId(
                  event.target.value
                );

                setPage(
                  1
                );
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Branches
              </option>

              {branches.map(
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
                      branch.branch_name ||
                      `Branch #${branch.id}`}
                  </option>
                )
              )}
            </select>

            {/* DEPARTMENT */}

            <select
              value={
                filterDepartmentId
              }
              onChange={(
                event
              ) => {
                setFilterDepartmentId(
                  event.target.value
                );

                setPage(
                  1
                );
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Departments
              </option>

              {departmentOptions.map(
                (
                  department
                ) => (
                  <option
                    key={
                      department.value
                    }
                    value={
                      department.value
                    }
                  >
                    {
                      department.label
                    }
                  </option>
                )
              )}
            </select>

            {/* DESIGNATION */}

            <select
              value={
                filterDesignationId
              }
              onChange={(
                event
              ) => {
                setFilterDesignationId(
                  event.target.value
                );

                setPage(
                  1
                );
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Designations
              </option>

              {designationOptions.map(
                (
                  designation
                ) => (
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

            {/* REASON */}

            <select
              value={
                filterReason
              }
              onChange={(
                event
              ) => {
                setFilterReason(
                  event.target.value
                );

                setPage(
                  1
                );
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[240px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">
                All Transfer Reasons
              </option>

              {reasonOptions.map(
                (
                  reason
                ) => (
                  <option
                    key={
                      reason
                    }
                    value={
                      reason
                    }
                  >
                    {
                      reason
                    }
                  </option>
                )
              )}
            </select>

            {/* CLEAR */}

            {(
              search ||
              filterCompanyId ||
              filterBranchId ||
              filterDepartmentId ||
              filterDesignationId ||
              filterReason
            ) && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* VIEW / STATUS */}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "table"
                  );

                  setPage(
                    1
                  );
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode ===
                  "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
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

                  setPage(
                    1
                  );
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode ===
                  "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
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
                (
                  status
                ) => (
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
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {
                      status
                    }
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          DATA
      ===================================================== */}

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading...
        </div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No transfers found
          </h3>

          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* ===================================================
           TABLE VIEW
        =================================================== */

        <div className="w-full min-w-0 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[17%]" />
              <col className="w-[17%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
            </colgroup>

            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">
                  Employee
                </th>

                <th className="px-4 py-3 font-medium">
                  Current Department
                </th>

                <th className="px-4 py-3 font-medium">
                  Transfer Department
                </th>

                <th className="px-4 py-3 font-medium">
                  Location
                </th>

                <th className="px-4 py-3 font-medium">
                  Transfer Dates
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
              {paged.map(
                (transfer) => {
                  const employee =
                    employeeMap[
                      transfer.employee_id
                    ];

                  const employeeName =
                    getEmployeeName(
                      employee
                    ) ||
                    `Employee #${transfer.employee_id}`;

                  const isActive =
                    transfer.is_active !==
                    false;

                  const fromDepartment =
                    transfer.from_department;

                  const toDepartment =
                    transfer.to_department;

                  const transferLocation =
                    getTransferLocation(
                      transfer
                    );

                  const transferReason =
                    getTransferReason(
                      transfer
                    );

                  const accomplishments =
                    getAccomplishments(
                      transfer
                    );

                  return (
                    <tr
                      key={
                        transfer.id
                      }
                      className="relative hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {/* EMPLOYEE */}

                      <td className="min-w-0 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar
                            name={
                              employeeName
                            }
                            size="sm"
                          />

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                              {
                                employeeName
                              }
                            </p>

                            <p className="truncate text-[10px] text-slate-400">
                              {employee?.employee_code ||
                                `#${transfer.employee_id}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* CURRENT DEPARTMENT */}

                      <td className="relative px-4 py-3">
                        <DepartmentHoverTrigger
                          align="left"
                          panel={
                            <DepartmentDetailsCard
                              roleLabel="Current Department"
                              tone="from"
                              department={
                                fromDepartment
                              }
                              departmentFallback={`#${transfer.from_department_id || "—"}`}
                              employeeName={
                                employeeName
                              }
                              employeeCode={
                                employee?.employee_code
                              }
                              location={
                                transferLocation
                              }
                              transferReason={
                                transferReason
                              }
                              transferApplyDate={
                                transfer.transfer_apply_date
                              }
                              relievingDate={
                                transfer.relieving_date
                              }
                              joiningDate={
                                transfer.joining_date
                              }
                              accomplishments={
                                accomplishments
                              }
                              isActive={
                                isActive
                              }
                            />
                          }
                        >
                          <DepartmentBadge
                            tone="from"
                            label={getDepartmentName(
                              fromDepartment,
                              `#${transfer.from_department_id || "—"}`
                            )}
                          />
                        </DepartmentHoverTrigger>
                      </td>

                      {/* TRANSFER DEPARTMENT */}

                      <td className="relative px-4 py-3">
                        <DepartmentHoverTrigger
                          align="left"
                          panel={
                            <DepartmentDetailsCard
                              roleLabel="Transfer Department"
                              tone="to"
                              department={
                                toDepartment
                              }
                              departmentFallback={`#${transfer.to_department_id || "—"}`}
                              employeeName={
                                employeeName
                              }
                              employeeCode={
                                employee?.employee_code
                              }
                              location={
                                transferLocation
                              }
                              transferReason={
                                transferReason
                              }
                              transferApplyDate={
                                transfer.transfer_apply_date
                              }
                              relievingDate={
                                transfer.relieving_date
                              }
                              joiningDate={
                                transfer.joining_date
                              }
                              accomplishments={
                                accomplishments
                              }
                              isActive={
                                isActive
                              }
                            />
                          }
                        >
                          <DepartmentBadge
                            tone="to"
                            label={getDepartmentName(
                              toDepartment,
                              `#${transfer.to_department_id || "—"}`
                            )}
                          />
                        </DepartmentHoverTrigger>
                      </td>

                      {/* LOCATION */}

                      <td className="min-w-0 overflow-hidden px-4 py-3">
                        <span
                          title={
                            transferLocation
                          }
                          className="block max-w-full truncate text-xs font-medium text-slate-600 dark:text-slate-300"
                        >
                          {
                            transferLocation
                          }
                        </span>
                      </td>

                      {/* TRANSFER DATES */}

                      <td className="px-4 py-3">
                        <div className="space-y-0.5 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                          <p>
                            <span className="font-medium text-slate-400">
                              Apply:
                            </span>{" "}
                            {formatDate(
                              transfer.transfer_apply_date
                            )}
                          </p>

                          <p>
                            <span className="font-medium text-slate-400">
                              Relieve:
                            </span>{" "}
                            {formatDate(
                              transfer.relieving_date
                            )}
                          </p>

                          <p>
                            <span className="font-medium text-slate-400">
                              Join:
                            </span>{" "}
                            {formatDate(
                              transfer.joining_date
                            )}
                          </p>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td className="px-4 py-3">
                        <div className="flex justify-start">
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                isActive
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              }`}
                            />

                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* ACTIONS */}

                      <td className="px-2 py-3">
                        <div className="flex w-full items-center justify-end gap-0.5">
                          <TableIconButton
                            title="Edit"
                            onClick={() =>
                              handleEdit(
                                transfer
                              )
                            }
                            tone="slate"
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
                          </TableIconButton>

                          {isActive ? (
                            <TableIconButton
                              title="Delete"
                              onClick={() =>
                                setDeleteTarget(
                                  transfer
                                )
                              }
                              tone="red"
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
                            </TableIconButton>
                          ) : (
                            <TableIconButton
                              title="Reactivate"
                              onClick={() =>
                                handleReactivate(
                                  transfer
                                )
                              }
                              disabled={
                                updateMutation.isPending
                              }
                              tone="emerald"
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
                            </TableIconButton>
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
      ) : (
        /* ===================================================
           CARD VIEW
        =================================================== */

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map(
            (transfer) => {
              const employee =
                employeeMap[
                  transfer.employee_id
                ];

              const employeeName =
                getEmployeeName(
                  employee
                ) ||
                `Employee #${transfer.employee_id}`;

              const isActive =
                transfer.is_active !==
                false;

              const fromDepartment =
                transfer.from_department;

              const toDepartment =
                transfer.to_department;

              const location =
                getTransferLocation(
                  transfer
                );

              const transferReason =
                getTransferReason(
                  transfer
                );

              const accomplishments =
                getAccomplishments(
                  transfer
                );

              return (
                <div
                  key={
                    transfer.id
                  }
                  className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="h-0.5 bg-primary-600" />

                  <div className="p-4">
                    {/* EMPLOYEE */}

                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          name={
                            employeeName
                          }
                          size="sm"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {
                              employeeName
                            }
                          </p>

                          <p className="truncate text-[10px] text-slate-400">
                            {employee?.employee_code ||
                              `#${transfer.employee_id}`}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        }`}
                      >
                        {isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                    {/* DEPARTMENTS */}

                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <DepartmentHoverTrigger
                        align="left"
                        panel={
                          <DepartmentDetailsCard
                            roleLabel="Current Department"
                            tone="from"
                            department={
                              fromDepartment
                            }
                            departmentFallback={`#${transfer.from_department_id || "—"}`}
                            employeeName={
                              employeeName
                            }
                            employeeCode={
                              employee?.employee_code
                            }
                            location={
                              location
                            }
                            transferReason={
                              transferReason
                            }
                            transferApplyDate={
                              transfer.transfer_apply_date
                            }
                            relievingDate={
                              transfer.relieving_date
                            }
                            joiningDate={
                              transfer.joining_date
                            }
                            accomplishments={
                              accomplishments
                            }
                            isActive={
                              isActive
                            }
                          />
                        }
                      >
                        <DepartmentBadge
                          tone="from"
                          label={getDepartmentName(
                            fromDepartment,
                            `#${transfer.from_department_id || "—"}`
                          )}
                        />
                      </DepartmentHoverTrigger>

                      <ArrowIcon />

                      <DepartmentHoverTrigger
                        align="left"
                        panel={
                          <DepartmentDetailsCard
                            roleLabel="Transfer Department"
                            tone="to"
                            department={
                              toDepartment
                            }
                            departmentFallback={`#${transfer.to_department_id || "—"}`}
                            employeeName={
                              employeeName
                            }
                            employeeCode={
                              employee?.employee_code
                            }
                            location={
                              location
                            }
                            transferReason={
                              transferReason
                            }
                            transferApplyDate={
                              transfer.transfer_apply_date
                            }
                            relievingDate={
                              transfer.relieving_date
                            }
                            joiningDate={
                              transfer.joining_date
                            }
                            accomplishments={
                              accomplishments
                            }
                            isActive={
                              isActive
                            }
                          />
                        }
                      >
                        <DepartmentBadge
                          tone="to"
                          label={getDepartmentName(
                            toDepartment,
                            `#${transfer.to_department_id || "—"}`
                          )}
                        />
                      </DepartmentHoverTrigger>
                    </div>

                    {/* APPLY DATE */}

                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <SmallCalendarIcon />

                      {formatDate(
                        transfer.transfer_apply_date
                      )}
                    </div>

                    {/* RELIEVING DATE */}

                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-medium">
                        Relieving:
                      </span>

                      {formatDate(
                        transfer.relieving_date
                      )}
                    </div>

                    {/* JOINING DATE */}

                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-medium">
                        Joining:
                      </span>

                      {formatDate(
                        transfer.joining_date
                      )}
                    </div>

                    {/* LOCATION */}

                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Location
                      </p>

                      <p
                        title={
                          location
                        }
                        className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        {location}
                      </p>
                    </div>

                    {/* REASON */}

                    <div className="mt-2">
                      <ReasonBadge
                        reason={
                          transferReason
                        }
                      />
                    </div>

                    {/* ACCOMPLISHMENTS */}

                    {accomplishments && (
                      <div className="mt-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Overall Records / Accomplishments
                        </p>

                        <AccomplishmentsPreview
                          accomplishments={
                            accomplishments
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}

                  <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-slate-700">
                    <div className="flex items-center justify-center py-1.5">
                      <TableIconButton
                        title="Edit"
                        onClick={() =>
                          handleEdit(
                            transfer
                          )
                        }
                        tone="slate"
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
                      </TableIconButton>
                    </div>

                    <div className="flex items-center justify-center py-1.5">
                      {isActive ? (
                        <TableIconButton
                          title="Delete"
                          onClick={() =>
                            setDeleteTarget(
                              transfer
                            )
                          }
                          tone="red"
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
                        </TableIconButton>
                      ) : (
                        <TableIconButton
                          title="Reactivate"
                          onClick={() =>
                            handleReactivate(
                              transfer
                            )
                          }
                          disabled={
                            updateMutation.isPending
                          }
                          tone="emerald"
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
                              d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5"
                            />
                          </svg>
                        </TableIconButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* =====================================================
          PAGINATION
      ===================================================== */}

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
                    current - 1
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
                    current + 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? "Edit Transfer"
            : "Add Transfer"
        }
      >
        <TransferForm
          formId="transfers-form"
          initialData={
            editing || {}
          }
          onSubmit={
            handleSubmit
          }
          loading={
            isSaving
          }
        />
      </Modal>

      {/* =====================================================
          DELETE CONFIRM
      ===================================================== */}

      <ConfirmDialog
        open={
          !!deleteTarget
        }
        onClose={() =>
          setDeleteTarget(
            null
          )
        }
        onConfirm={
          confirmDelete
        }
        title="Deactivate Transfer"
        message={
          deleteTarget
            ? "Are you sure you want to deactivate this transfer record?"
            : ""
        }
        confirmText="Deactivate"
        loading={
          deactivateMutation.isPending
        }
      />
    </div>
  );
}