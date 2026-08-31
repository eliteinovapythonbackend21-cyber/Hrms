import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";

import { useToast } from "@/components/feedback/Toast";
import { useIsHrEmployee } from "@/hooks/useIsHrEmployee";
import { useTableExport } from "@/hooks/useTableExport";

import { employeeLifecycleApi } from "@/api/employee.api";
import { employeesApi } from "@/api/employees.api";
import { masterApi } from "@/api/master.api";

import { useCompanies } from "@/features/master/company/useCompanies";

import {
  useDepartmentOptions,
  useDesignationOptions,
} from "@/hooks/useLookupOptions";

import PromotionForm from "./PromotionForm";

import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeactivatePromotion,
} from "./usePromotions";

import { formatDate } from "@/utils/formatDate";

/* =========================================================
   CONSTANTS
========================================================= */

const SKY_BADGE =
  "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400";

const PAGE_SIZE = 10;
const CARD_PAGE_SIZE = 6;

const EXPORT_COLUMNS = [
  {
    key: "employee_id",
    label: "Employee ID",
  },
  {
    key: "from_designation_id",
    label: "Current Designation",
  },
  {
    key: "to_designation_id",
    label: "Promoted To",
  },
  {
    key: "location",
    label: "Location",
  },
  {
    key: "promotion_date",
    label: "Promotion Date",
  },
  {
    key: "reason",
    label: "Promotion Reason",
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

/**
 * Normalize any date value coming from the API (or a JS Date
 * object) into the strict YYYY-MM-DD format required by
 * HTML <input type="date">.
 *
 * Handles:
 *  - "" / null / undefined                -> ""
 *  - Date instances                        -> local YYYY-MM-DD
 *  - "YYYY-MM-DD"                          -> as-is
 *  - "YYYY-MM-DDT00:00:00[.000Z]"          -> date part only
 *  - "YYYY-MM-DD 00:00:00"                 -> date part only
 *  - Any other parseable date string       -> local YYYY-MM-DD
 *  - Anything unparseable                  -> ""
 *
 * IMPORTANT: When falling back to `new Date(value)`, we rebuild
 * the string from getFullYear()/getMonth()/getDate() (LOCAL
 * time) rather than toISOString() (UTC), so the date never
 * shifts by a day due to timezone conversion. This was the
 * root cause of Promotion Date sometimes appearing blank when
 * editing a Promotion record.
 */
function normalizeDateForInput(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return "";
  }

  /*
   * Fast path: value already starts with YYYY-MM-DD
   * (covers "YYYY-MM-DD", "YYYY-MM-DDT...", "YYYY-MM-DD ...").
   */
  const isoMatch = stringValue.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  /*
   * Fallback: try to parse whatever format was given
   * (e.g. "MM/DD/YYYY", "DD-MM-YYYY", etc.) and rebuild
   * using LOCAL date parts.
   */
  const parsed = new Date(stringValue);

  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return "";
}

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

/* =========================================================
   ICONS
========================================================= */

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

const TrendUpIcon = () => (
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
      d="M3 17l6-6 4 4 8-8M21 7v6h-6"
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
      strokeWidth="2"
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
      strokeWidth="2"
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
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${SKY_BADGE}`}
        >
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
   DESIGNATION BADGE
========================================================= */

function DesignationBadge({
  label,
  tone,
}) {
  const dotTones = {
    from: "bg-slate-400 dark:bg-slate-500",
    to: "bg-sky-500",
  };

  const badgeTones = {
    from:
      "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-700/60 dark:text-slate-300 dark:ring-slate-400/20",

    to:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30",
  };

  return (
    <span
      title={label}
      className={`inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotTones[tone]}`}
      />

      <span className="max-w-[150px] truncate">
        {label}
      </span>
    </span>
  );
}

/* =========================================================
   DESIGNATION DETAILS CARD
========================================================= */

function DesignationDetailsCard({
  tone,
  fromDesignation,
  fromDesignationFallback,
  toDesignation,
  toDesignationFallback,
  employeeName,
  employeeCode,
  reason,
  promotionDate,
  duration,
  accomplishments,
  isActive,
}) {
  const accentTones = {
    from:
      "border-t-slate-400 dark:border-t-slate-500",

    to:
      "border-t-sky-500 dark:border-t-sky-400",
  };

  return (
    <div
      className={`w-[300px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 bg-white p-4 text-left shadow-xl dark:border-white/10 dark:bg-white/[0.06] ${accentTones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* CURRENT DESIGNATION */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Current Designation
            </p>

            <p className="mt-0.5 break-words text-sm font-semibold leading-5 text-slate-800 dark:text-white">
              {fromDesignation?.designation_name ||
                fromDesignationFallback}
            </p>
          </div>

          {/* ARROW + PROMOTED TO */}
          <div className="flex items-start gap-1.5">
            <span className="mt-1 shrink-0 text-slate-300 dark:text-slate-600">
              →
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-500 dark:text-sky-400">
                Promoted To
              </p>

              <p className="mt-0.5 break-words text-sm font-semibold leading-5 text-slate-800 dark:text-white">
                {toDesignation?.designation_name ||
                  toDesignationFallback}
              </p>
            </div>
          </div>
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

      {(fromDesignation?.description ||
        toDesignation?.description) && (
        <>
          <div className="my-3 border-t border-slate-100 dark:border-white/10" />

          <div className="space-y-2">
            {fromDesignation?.description && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Current Designation Description
                </p>

                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {fromDesignation.description}
                </p>
              </div>
            )}

            {toDesignation?.description && (
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Promoted To Description
                </p>

                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {toDesignation.description}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

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
            Reason
          </span>

          <span className="break-words text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {reason || "Other"}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Promotion Date
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {promotionDate || "—"}
          </span>
        </div>

        <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Duration
          </span>

          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {duration || "—"}
          </span>
        </div>
      </div>

      {accomplishments && (
        <>
          <div className="my-3 border-t border-slate-100 dark:border-white/10" />

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Overall Records / Accomplishments
            </p>

            <p className="max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-600 dark:text-slate-300">
              {accomplishments}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER
========================================================= */

/*
 * NOTE ON THE HOVER GAP FIX:
 *
 * The trigger badge and its floating detail panel are two
 * separate boxes. The panel is positioned "top-full" below
 * the badge. Previously the gap between them was created with
 * `mt-2` (margin), which is NOT part of the hoverable box.
 * Moving the mouse in a straight line from the badge down into
 * the panel meant the cursor briefly left the hoverable area
 * while crossing that margin gap, which caused the panel to
 * flicker/disappear (i.e. "remove the previous record") before
 * the user could actually read or interact with it.
 *
 * Fix: the gap is now `pt-2` (padding) on the same absolutely
 * positioned wrapper that holds the panel. Padding IS part of
 * the box, so the hoverable region is continuous from the
 * badge all the way into the panel — the popover stays visible
 * the whole time the pointer is moving from the trigger to the
 * panel, with no dead zone in between.
 */

function DesignationHoverTrigger({
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
      className="group/desig relative inline-flex max-w-full outline-none"
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
          pt-2
          opacity-0
          transition-opacity
          duration-150
          group-hover/desig:pointer-events-auto
          group-hover/desig:visible
          group-hover/desig:opacity-100
          group-focus/desig:pointer-events-auto
          group-focus/desig:visible
          group-focus/desig:opacity-100
          group-focus-within/desig:pointer-events-auto
          group-focus-within/desig:visible
          group-focus-within/desig:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
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
      title={reason || "Other"}
      className="inline-flex max-w-full items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30"
    >
      <span className="max-w-[180px] truncate">
        {reason || "Other"}
      </span>
    </span>
  );
}

/* =========================================================
   DURATION
========================================================= */

function formatDuration(
  startDate,
  endDate
) {
  if (!startDate) {
    return "—";
  }

  const start = new Date(
    startDate
  );

  const end = endDate
    ? new Date(endDate)
    : new Date();

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    ) ||
    end < start
  ) {
    return "—";
  }

  let years =
    end.getFullYear() -
    start.getFullYear();

  let months =
    end.getMonth() -
    start.getMonth();

  let days =
    end.getDate() -
    start.getDate();

  if (days < 0) {
    months -= 1;

    const daysInPreviousMonth =
      new Date(
        end.getFullYear(),
        end.getMonth(),
        0
      ).getDate();

    days += daysInPreviousMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];

  if (years > 0) {
    parts.push(
      `${years} yr${
        years > 1 ? "s" : ""
      }`
    );
  }

  if (months > 0) {
    parts.push(
      `${months} mo${
        months > 1 ? "s" : ""
      }`
    );
  }

  if (days > 0) {
    parts.push(
      `${days} day${
        days > 1 ? "s" : ""
      }`
    );
  }

  return parts.length
    ? parts.join(" ")
    : "0 days";
}

/* =========================================================
   TABLE ACTION BUTTON
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
   LOCATION
========================================================= */

function getEmployeeLocation(
  employee
) {
  if (!employee) {
    return "—";
  }

  const location =
    employee.location ||
    employee.branch?.location ||
    employee.department?.branch
      ?.location ||
    employee.department
      ?.location ||
    employee.company?.location ||
    employee.address;

  if (
    typeof location ===
    "string"
  ) {
    return (
      location.trim() || "—"
    );
  }

  if (
    location &&
    typeof location ===
      "object"
  ) {
    return (
      location.name ||
      location.location_name ||
      location.branch_name ||
      location.city ||
      location.address ||
      "—"
    );
  }

  return "—";
}

/* =========================================================
   PAGE
========================================================= */

export default function PromotionListPage() {
  const { showToast } =
    useToast();

  // HR-department employees: this screen is view-only.
  const { isHrEmployee: readOnly } = useIsHrEmployee();

  /* =======================================================
     PROMOTIONS
  ======================================================= */

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePromotions({
    page: 1,
    per_page: 1000,
  });

  const allPromotions =
    allData?.items || [];

  /* =======================================================
     EMPLOYEES
  ======================================================= */

  const {
    data: employeesData,
  } = useQuery({
    queryKey: [
      "promotions-page",
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
     DESIGNATIONS
  ======================================================= */

  const {
    data: designationsData,
  } = useQuery({
    queryKey: [
      "promotions-page",
      "designations-full",
    ],

    queryFn: async () =>
      (
        await masterApi.listDesignations({
          page: 1,
          per_page: 500,
        })
      ).data.data,
  });

  const designationFullMap =
    useMemo(
      () =>
        Object.fromEntries(
          (
            designationsData?.items ||
            []
          ).map(
            (designation) => [
              designation.id,
              designation,
            ]
          )
        ),
      [designationsData]
    );

  /* =======================================================
     COMPANIES
  ======================================================= */

  const {
    data: companyData,
  } = useCompanies({
    page: 1,
    per_page: 100,
  });

  const companies =
    companyData?.items ||
    companyData?.data ||
    [];

  /* =======================================================
     LOOKUP OPTIONS
  ======================================================= */

  const departmentOptions =
    useDepartmentOptions();

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
            employee.department
              ?.branch ||
            employee.branch;

          if (!branch?.id) {
            return;
          }

          const company =
            employee.department
              ?.company ||
            employee.company;

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
            String(company.id) !==
              String(
                filterCompanyId
              )
          ) {
            return;
          }

          (
            company.branches ||
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
      ).sort(
        (a, b) =>
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
     EMPLOYEE TIMELINE
  ======================================================= */

  const employeeTimeline =
    useMemo(() => {
      const map = new Map();

      allPromotions.forEach(
        (promotion) => {
          if (
            !map.has(
              promotion.employee_id
            )
          ) {
            map.set(
              promotion.employee_id,
              []
            );
          }

          map
            .get(
              promotion.employee_id
            )
            .push(promotion);
        }
      );

      map.forEach(
        (list) => {
          list.sort(
            (a, b) =>
              new Date(
                a.promotion_date
              ) -
              new Date(
                b.promotion_date
              )
          );
        }
      );

      return map;
    }, [allPromotions]);

  /* =======================================================
     MUTATIONS
  ======================================================= */

  const createMutation =
    useCreatePromotion();

  const updateMutation =
    useUpdatePromotion();

  const deactivateMutation =
    useDeactivatePromotion();

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

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState(null);

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
        .promotions.list,

    queryParams: {
      search:
        search || undefined,
    },

    exportColumns:
      EXPORT_COLUMNS,

    filename:
      "promotions",

    title:
      "Promotions",
  });

  /* =======================================================
     ACTIVE PROMOTIONS
  ======================================================= */

  const activePromotions =
    allPromotions.filter(
      (promotion) =>
        promotion.is_active !==
        false
    );

  /* =======================================================
     STATISTICS
  ======================================================= */

  const thisMonthCount =
    useMemo(() => {
      const now = new Date();

      return activePromotions.filter(
        (promotion) => {
          if (
            !promotion.promotion_date
          ) {
            return false;
          }

          const date =
            new Date(
              promotion.promotion_date
            );

          return (
            date.getMonth() ===
              now.getMonth() &&
            date.getFullYear() ===
              now.getFullYear()
          );
        }
      ).length;
    }, [activePromotions]);

  const uniqueEmployeeCount =
    useMemo(
      () =>
        new Set(
          activePromotions.map(
            (promotion) =>
              promotion.employee_id
          )
        ).size,
      [activePromotions]
    );

  /* =======================================================
     REASONS
  ======================================================= */

  const reasonOptions =
    useMemo(() => {
      const reasons =
        new Set();

      allPromotions.forEach(
        (promotion) => {
          if (
            promotion.reason
          ) {
            reasons.add(
              promotion.reason
            );
          }
        }
      );

      [
        "Performance Improvement",
        "Outstanding Performance",
        "Consistent High Performance",
        "Achievement of Targets",
        "Increased Responsibilities",
        "Leadership Skills",
        "Skill Enhancement",
        "Additional Qualifications",
        "Experience / Tenure",
        "Career Growth",
        "Role Expansion",
        "Successful Project Completion",
        "Business Requirements",
        "Critical Role / Business Need",
        "Succession Planning",
        "Internal Career Progression",
        "Recognition / Merit",
        "Promotion After Performance Review",
        "Promotion After Probation",
        "Other",
      ].forEach(
        (reason) =>
          reasons.add(reason)
      );

      return Array.from(
        reasons
      ).sort();
    }, [allPromotions]);

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filtered =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return allPromotions
        .filter(
          (promotion) => {
            if (
              statusFilter ===
                "active" &&
              promotion.is_active ===
                false
            ) {
              return false;
            }

            if (
              statusFilter ===
                "inactive" &&
              promotion.is_active !==
                false
            ) {
              return false;
            }

            const employee =
              employeeMap[
                promotion.employee_id
              ];

            const employeeCompany =
              employee?.department
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

            const employeeBranch =
              employee?.department
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

            if (
              filterDesignationId &&
              String(
                promotion.from_designation_id
              ) !==
                String(
                  filterDesignationId
                ) &&
              String(
                promotion.to_designation_id
              ) !==
                String(
                  filterDesignationId
                )
            ) {
              return false;
            }

            if (
              filterReason &&
              String(
                promotion.reason ||
                  ""
              ) !==
                String(
                  filterReason
                )
            ) {
              return false;
            }

            if (
              normalizedSearch
            ) {
              const employeeName =
                getEmployeeName(
                  employee
                );

              const employeeCode =
                employee?.employee_code ||
                "";

              const fromDesignation =
                designationFullMap[
                  promotion
                    .from_designation_id
                ]?.designation_name ||
                "";

              const toDesignation =
                designationFullMap[
                  promotion
                    .to_designation_id
                ]?.designation_name ||
                "";

              const location =
                getEmployeeLocation(
                  employee
                );

              const haystack = [
                employeeName,
                employeeCode,
                promotion.reason ||
                  "",
                promotion.accomplishments ||
                  "",
                fromDesignation,
                toDesignation,
                location,
                promotion.promotion_date ||
                  "",
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
              b.promotion_date
            ) -
            new Date(
              a.promotion_date
            )
        );
    }, [
      allPromotions,
      statusFilter,
      search,
      employeeMap,
      designationFullMap,
      filterCompanyId,
      filterBranchId,
      filterDepartmentId,
      filterDesignationId,
      filterReason,
    ]);

  /* =======================================================
     GROUP BY EMPLOYEE
  ======================================================= */

  const groupedByEmployee =
    useMemo(() => {
      const groups =
        new Map();

      filtered.forEach(
        (promotion) => {
          if (
            !groups.has(
              promotion.employee_id
            )
          ) {
            groups.set(
              promotion.employee_id,
              {
                employeeId:
                  promotion.employee_id,

                employee:
                  employeeMap[
                    promotion.employee_id
                  ],

                promotions: [],
              }
            );
          }

          groups
            .get(
              promotion.employee_id
            )
            .promotions.push(
              promotion
            );
        }
      );

      return Array.from(
        groups.values()
      ).sort(
        (a, b) => {
          const nameA =
            getEmployeeName(
              a.employee
            );

          const nameB =
            getEmployeeName(
              b.employee
            );

          return nameA.localeCompare(
            nameB
          );
        }
      );
    }, [
      filtered,
      employeeMap,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const pageSize =
    viewMode === "card"
      ? CARD_PAGE_SIZE
      : PAGE_SIZE;

  const totalForPaging =
    viewMode === "card"
      ? groupedByEmployee.length
      : filtered.length;

  const pageCount =
    Math.max(
      1,
      Math.ceil(
        totalForPaging /
          pageSize
      )
    );

  const paged =
    filtered.slice(
      (page - 1) *
        pageSize,
      page * pageSize
    );

  const pagedGroups =
    groupedByEmployee.slice(
      (page - 1) *
        pageSize,
      page * pageSize
    );

  /* =======================================================
     PROMOTION DETAILS
  ======================================================= */

  const getPromotionDetails =
    (promotion) => {
      const timeline =
        employeeTimeline.get(
          promotion.employee_id
        ) || [];

      const index =
        timeline.findIndex(
          (item) =>
            item.id ===
            promotion.id
        );

      const previous =
        index > 0
          ? timeline[index - 1]
          : null;

      const next =
        index >= 0 &&
        index <
          timeline.length - 1
          ? timeline[index + 1]
          : null;

      const employee =
        employeeMap[
          promotion.employee_id
        ];

      const previousRoleStart =
        previous
          ? previous.promotion_date
          : employee?.joining_date;

      return {
        previousRoleStart,

        timeInPreviousRole:
          formatDuration(
            previousRoleStart,
            promotion.promotion_date
          ),

        timeInNewRole:
          next
            ? formatDuration(
                promotion.promotion_date,
                next.promotion_date
              )
            : `${formatDuration(
                promotion.promotion_date,
                null
              )} (current)`,

        fromDesig:
          designationFullMap[
            promotion
              .from_designation_id
          ],

        toDesig:
          designationFullMap[
            promotion
              .to_designation_id
          ],
      };
    };

  /* =======================================================
     HANDLERS
  ======================================================= */

  const handleAdd = () => {
    if (readOnly) return;
    setEditing(null);
    setModalOpen(true);
  };

  /* =======================================================
     EDIT PROMOTION
  ======================================================= */

  const handleEdit = (
    promotion
  ) => {
    if (readOnly) return;
    /*
     * IMPORTANT:
     *
     * The backend may return:
     *   2026-08-19
     *   2026-08-19T00:00:00
     *   2026-08-19 00:00:00
     *
     * <input type="date"> requires:
     *   2026-08-19
     *
     * normalizeDateForInput() now robustly handles
     * Date objects, ISO strings with a time component,
     * and other date-like strings instead of relying
     * on a naive string slice - this is what was causing
     * Promotion Date to sometimes render blank on edit.
     */

    const normalizedPromotion = {
      ...promotion,

      employee_id:
        promotion.employee_id ||
        promotion.employee?.id ||
        "",

      from_designation_id:
        promotion.from_designation_id ||
        promotion.from_designation?.id ||
        "",

      to_designation_id:
        promotion.to_designation_id ||
        promotion.to_designation?.id ||
        "",

      reason:
        promotion.reason ||
        "Other",

      promotion_date:
        normalizeDateForInput(
          promotion.promotion_date ||
            promotion.effective_date
        ),

      accomplishments:
        promotion.accomplishments ||
        "",

      is_active:
        promotion.is_active !==
        false,
    };

    /*
     * Remove the old field from edit state.
     */
    delete normalizedPromotion.effective_date;

    setEditing(
      normalizedPromotion
    );

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
    if (readOnly) return;
      try {
        const normalizedPayload = {
          ...payload,

          employee_id:
            payload.employee_id
              ? Number(
                  payload.employee_id
                )
              : payload.employee_id,

          from_designation_id:
            payload.from_designation_id
              ? Number(
                  payload.from_designation_id
                )
              : payload.from_designation_id,

          to_designation_id:
            payload.to_designation_id
              ? Number(
                  payload.to_designation_id
                )
              : payload.to_designation_id,

          promotion_date:
            normalizeDateForInput(
              payload.promotion_date
            ),

          reason:
            payload.reason ||
            "Other",

          accomplishments:
            payload.accomplishments ??
            "",
        };

        /*
         * Old field must not be sent.
         */
        delete normalizedPayload.effective_date;

        if (editing) {
          await updateMutation.mutateAsync(
            {
              id: editing.id,
              payload:
                normalizedPayload,
            }
          );

          showToast(
            "Promotion updated",
            "success"
          );
        } else {
          await createMutation.mutateAsync(
            normalizedPayload
          );

          showToast(
            "Promotion created",
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
    if (readOnly) return;
      if (!deleteTarget) {
        return;
      }

      try {
        await deactivateMutation.mutateAsync(
          deleteTarget.id
        );

        showToast(
          "Promotion deactivated",
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
    async (promotion) => {
    if (readOnly) return;
      try {
        await updateMutation.mutateAsync(
          {
            id: promotion.id,
            payload: {
              is_active: true,
            },
          }
        );

        showToast(
          "Promotion reactivated",
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
        Failed to load promotions.
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
            Promotions
          </h1>

          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Employee promotion history
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
            exporting={exporting}
          />

{readOnly ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/15 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              View only
            </span>
          ) : (
          <Button
            type="button"
            onClick={handleAdd}
            className="h-10 w-full px-4 sm:w-auto"
          >
            <span className="mr-1.5 text-lg">
              +
            </span>

            Add Promotion
          </Button>
          )}
        </div>
      </div>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<TrendUpIcon />}
          value={
            activePromotions.length
          }
          label="Total Promotions"
        />

        <StatCard
          icon={<CalendarIcon />}
          value={thisMonthCount}
          label="This Month"
        />

        <StatCard
          icon={<UsersIcon />}
          value={
            uniqueEmployeeCount
          }
          label="Employees Promoted"
        />
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
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
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value
                  );
                  setPage(1);
                }}
                placeholder="Search employee, reason or accomplishments..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>

            {/* COMPANY */}

            <select
              value={filterCompanyId}
              onChange={(event) => {
                setFilterCompanyId(
                  event.target.value
                );
                setFilterBranchId("");
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Companies
              </option>

              {companies.map(
                (company) => (
                  <option
                    key={company.id}
                    value={company.id}
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
              value={filterBranchId}
              onChange={(event) => {
                setFilterBranchId(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Branches
              </option>

              {branches.map(
                (branch) => (
                  <option
                    key={branch.id}
                    value={branch.id}
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
              value={filterDepartmentId}
              onChange={(event) => {
                setFilterDepartmentId(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Departments
              </option>

              {departmentOptions.map(
                (department) => (
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
              value={filterDesignationId}
              onChange={(event) => {
                setFilterDesignationId(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[180px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
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

            {/* REASON */}

            <select
              value={filterReason}
              onChange={(event) => {
                setFilterReason(
                  event.target.value
                );
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 sm:max-w-[240px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">
                All Promotion Reasons
              </option>

              {reasonOptions.map(
                (reason) => (
                  <option
                    key={reason}
                    value={reason}
                  >
                    {reason}
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
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* VIEW / STATUS */}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setViewMode(
                    "table"
                  );
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "table"
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
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Card
              </button>
            </div>

            <div className="flex w-fit items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
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
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                      statusFilter ===
                      status
                        ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {status}
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
      ) : viewMode === "table" ? (
        paged.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
              No promotions found
            </h3>

            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              No records match your current search or filters.
            </p>
          </div>
        ) : (
          <div className="w-full min-w-0 max-lg:overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-sm lg:min-w-0">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
              </colgroup>

              <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Employee
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Current Designation
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Promoted To
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Employee Location
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Promotion Date
                  </th>

                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Status
                  </th>

                  <th className="whitespace-nowrap px-3 py-3 text-center font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paged.map(
                  (promotion) => {
                    const employee =
                      employeeMap[
                        promotion.employee_id
                      ];

                    const employeeName =
                      getEmployeeName(
                        employee
                      ) ||
                      `Employee #${promotion.employee_id}`;

                    const employeeLocation =
                      getEmployeeLocation(
                        employee
                      );

                    const isActive =
                      promotion.is_active !==
                      false;

                    const timeline =
                      employeeTimeline.get(
                        promotion.employee_id
                      ) || [];

                    const index =
                      timeline.findIndex(
                        (item) =>
                          item.id ===
                          promotion.id
                      );

                    const previous =
                      index > 0
                        ? timeline[
                            index - 1
                          ]
                        : null;

                    const next =
                      index >= 0 &&
                      index <
                        timeline.length - 1
                        ? timeline[
                            index + 1
                          ]
                        : null;

                    const previousRoleStart =
                      previous
                        ? previous.promotion_date
                        : employee?.joining_date;

                    const timeInPreviousRole =
                      formatDuration(
                        previousRoleStart,
                        promotion.promotion_date
                      );

                    const timeInNewRole =
                      next
                        ? formatDuration(
                            promotion.promotion_date,
                            next.promotion_date
                          )
                        : `${formatDuration(
                            promotion.promotion_date,
                            null
                          )} (current)`;

                    const fromDesignation =
                      designationFullMap[
                        promotion
                          .from_designation_id
                      ];

                    const toDesignation =
                      designationFullMap[
                        promotion
                          .to_designation_id
                      ];

                    return (
                      <tr
                        key={
                          promotion.id
                        }
                        className="group tbl-row"
                      >
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
                                  `#${promotion.employee_id}`}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="relative min-w-0 px-4 py-3">
                          <DesignationHoverTrigger
                            align="left"
                            panel={
                              <DesignationDetailsCard
                                tone="from"
                                fromDesignation={
                                  fromDesignation
                                }
                                fromDesignationFallback={`#${promotion.from_designation_id}`}
                                toDesignation={
                                  toDesignation
                                }
                                toDesignationFallback={`#${promotion.to_designation_id}`}
                                employeeName={
                                  employeeName
                                }
                                employeeCode={
                                  employee?.employee_code
                                }
                                reason={
                                  promotion.reason
                                }
                                promotionDate={formatDate(
                                  promotion.promotion_date
                                )}
                                duration={
                                  timeInNewRole
                                }
                                accomplishments={
                                  promotion.accomplishments
                                }
                                isActive={
                                  isActive
                                }
                              />
                            }
                          >
                            <DesignationBadge
                              tone="from"
                              label={
                                fromDesignation?.designation_name ||
                                `#${promotion.from_designation_id}`
                              }
                            />
                          </DesignationHoverTrigger>
                        </td>

                        <td className="relative min-w-0 px-4 py-3">
                          <DesignationHoverTrigger
                            align="left"
                            panel={
                              <DesignationDetailsCard
                                tone="to"
                                fromDesignation={
                                  fromDesignation
                                }
                                fromDesignationFallback={`#${promotion.from_designation_id}`}
                                toDesignation={
                                  toDesignation
                                }
                                toDesignationFallback={`#${promotion.to_designation_id}`}
                                employeeName={
                                  employeeName
                                }
                                employeeCode={
                                  employee?.employee_code
                                }
                                reason={
                                  promotion.reason
                                }
                                promotionDate={formatDate(
                                  promotion.promotion_date
                                )}
                                duration={
                                  timeInNewRole
                                }
                                accomplishments={
                                  promotion.accomplishments
                                }
                                isActive={
                                  isActive
                                }
                              />
                            }
                          >
                            <DesignationBadge
                              tone="to"
                              label={
                                toDesignation?.designation_name ||
                                `#${promotion.to_designation_id}`
                              }
                            />
                          </DesignationHoverTrigger>
                        </td>

                        <td className="min-w-0 px-4 py-3">
                          <span
                            title={
                              employeeLocation
                            }
                            className="block truncate text-xs font-medium text-slate-600 dark:text-slate-300"
                          >
                            {
                              employeeLocation
                            }
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="block truncate whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
                            {formatDate(
                              promotion.promotion_date
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
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
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex w-full items-center justify-center gap-1">
                            <TableIconButton
                              title="Edit"
                              onClick={() =>
                                handleEdit(
                                  promotion
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
                                    promotion
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
                                    promotion
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
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )
      ) : pagedGroups.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
            No promotions found
          </h3>

          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pagedGroups.map(
            (group) => {
              const employee =
                group.employee;

              const employeeName =
                getEmployeeName(
                  employee
                ) ||
                `Employee #${group.employeeId}`;

              const sortedPromotions =
                [...group.promotions].sort(
                  (a, b) =>
                    new Date(
                      b.promotion_date
                    ) -
                    new Date(
                      a.promotion_date
                    )
                );

              return (
                <div
                  key={
                    group.employeeId
                  }
                  className="relative overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-primary-600" />

                  <div className="p-4">
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
                              `#${group.employeeId}`}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                        {
                          group
                            .promotions
                            .length
                        }{" "}
                        promo
                        {group.promotions
                          .length !== 1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    <div className="my-3 border-t border-slate-100 dark:border-white/10" />

                    <div className="space-y-2.5">
                      {sortedPromotions.map(
                        (promotion) => {
                          const isActive =
                            promotion.is_active !==
                            false;

                          const {
                            previousRoleStart,
                            timeInPreviousRole,
                            timeInNewRole,
                            fromDesig,
                            toDesig,
                          } =
                            getPromotionDetails(
                              promotion
                            );

                          return (
                            <div
                              key={
                                promotion.id
                              }
                              className="relative overflow-visible rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
                            >
                              <div className="px-2.5 py-2.5">
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                                    <DesignationHoverTrigger
                                      align="left"
                                      panel={
                                        <DesignationDetailsCard
                                          tone="from"
                                          fromDesignation={
                                            fromDesig
                                          }
                                          fromDesignationFallback={`#${promotion.from_designation_id}`}
                                          toDesignation={
                                            toDesig
                                          }
                                          toDesignationFallback={`#${promotion.to_designation_id}`}
                                          employeeName={
                                            employeeName
                                          }
                                          employeeCode={
                                            employee?.employee_code
                                          }
                                          reason={
                                            promotion.reason
                                          }
                                          promotionDate={formatDate(
                                            promotion.promotion_date
                                          )}
                                          duration={
                                            timeInNewRole
                                          }
                                          accomplishments={
                                            promotion.accomplishments
                                          }
                                          isActive={
                                            isActive
                                          }
                                        />
                                      }
                                    >
                                      <DesignationBadge
                                        tone="from"
                                        label={
                                          fromDesig?.designation_name ||
                                          `#${promotion.from_designation_id}`
                                        }
                                      />
                                    </DesignationHoverTrigger>

                                    <ArrowIcon />

                                    <DesignationHoverTrigger
                                      align="left"
                                      panel={
                                        <DesignationDetailsCard
                                          tone="to"
                                          fromDesignation={
                                            fromDesig
                                          }
                                          fromDesignationFallback={`#${promotion.from_designation_id}`}
                                          toDesignation={
                                            toDesig
                                          }
                                          toDesignationFallback={`#${promotion.to_designation_id}`}
                                          employeeName={
                                            employeeName
                                          }
                                          employeeCode={
                                            employee?.employee_code
                                          }
                                          reason={
                                            promotion.reason
                                          }
                                          promotionDate={formatDate(
                                            promotion.promotion_date
                                          )}
                                          duration={
                                            timeInNewRole
                                          }
                                          accomplishments={
                                            promotion.accomplishments
                                          }
                                          isActive={
                                            isActive
                                          }
                                        />
                                      }
                                    >
                                      <DesignationBadge
                                        tone="to"
                                        label={
                                          toDesig?.designation_name ||
                                          `#${promotion.to_designation_id}`
                                        }
                                      />
                                    </DesignationHoverTrigger>
                                  </div>

                                  <span
                                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                      isActive
                                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                                        : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                                    }`}
                                  >
                                    <span
                                      className={`h-1 w-1 rounded-full ${
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

                                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <SmallCalendarIcon />

                                  {formatDate(
                                    promotion.promotion_date
                                  )}
                                </div>

                                <div className="mt-1.5">
                                  <ReasonBadge
                                    reason={
                                      promotion.reason
                                    }
                                  />
                                </div>

                                {promotion.accomplishments && (
                                  <p
                                    className="mt-1.5 truncate text-xs text-slate-500 dark:text-slate-400"
                                    title={
                                      promotion.accomplishments
                                    }
                                  >
                                    {
                                      promotion.accomplishments
                                    }
                                  </p>
                                )}

                                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                  <div>
                                    <span className="text-slate-400">
                                      Previous:
                                    </span>{" "}
                                    {
                                      timeInPreviousRole
                                    }
                                  </div>

                                  <div>
                                    <span className="text-slate-400">
                                      New:
                                    </span>{" "}
                                    {
                                      timeInNewRole
                                    }
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-700 dark:border-white/10">
                                <div className="flex items-center justify-center py-1.5">
                                  <TableIconButton
                                    title="Edit"
                                    onClick={() =>
                                      handleEdit(
                                        promotion
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
                                          promotion
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
                                          promotion
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

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
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
                  currentPage
                ) =>
                  Math.max(
                    1,
                    currentPage - 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-slate-700"
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
                  currentPage
                ) =>
                  Math.min(
                    pageCount,
                    currentPage + 1
                  )
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      <Modal
        open={
          modalOpen
        }
        onClose={
          closeModal
        }
        title={
          editing
            ? "Edit Promotion"
            : "Add Promotion"
        }
      >
        <PromotionForm
          formId="promotions-form"
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
        title="Deactivate Promotion"
        message={
          deleteTarget
            ? "Are you sure you want to deactivate this promotion record?"
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