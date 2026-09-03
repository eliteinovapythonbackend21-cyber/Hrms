import { useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/feedback/ConfirmDialog";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";
import { useTableExport } from "@/hooks/useTableExport";

import {
  useEmployeeTargets,
  useCreateEmployeeTarget,
  useUpdateEmployeeTarget,
  useDeactivateEmployeeTarget,
  useReactivateEmployeeTarget,
} from "./useEmployeeTargets";

import { useCRMEmployeeOptions } from "@/hooks/useLookupOptions";
import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";
import { Link } from "react-router-dom";
import { useIncentiveSummary } from "@/features/crm/incentives/useIncentives";
import { formatCurrency } from "@/utils/formatCurrency";
import { getUser } from "@/utils/tokenHelpers";

/* =========================================================
   CONSTANTS
========================================================= */

const CARD_PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 10;
const CARD_HEIGHT = "h-[230px]";

const PERIOD_TYPES = ["Weekly", "Monthly", "Quarterly"];

const MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const QUARTER_OPTIONS = [
  { value: 1, label: "Q1 (Jan – Mar)" },
  { value: 2, label: "Q2 (Apr – Jun)" },
  { value: 3, label: "Q3 (Jul – Sep)" },
  { value: 4, label: "Q4 (Oct – Dec)" },
];

const now = new Date();

/* =========================================================
   HELPERS
========================================================= */

function getMonthLabel(month) {
  return MONTH_OPTIONS.find((m) => m.value === Number(month))?.label || month;
}

function getMonthShort(month) {
  return (getMonthLabel(month) || "").slice(0, 3);
}

function getQuarterLabel(quarter) {
  return QUARTER_OPTIONS.find((q) => q.value === Number(quarter))?.label || `Q${quarter}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getEmployeeName(record) {
  if (record?.employee) {
    return `${record.employee.first_name || ""} ${record.employee.last_name || ""}`.trim();
  }
  return `Employee #${record?.employee_id ?? "-"}`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0]?.toUpperCase();
}

// Human-readable period label for any period_type, used everywhere
// a target's timeframe needs to be shown (cards, table, details panel).
function getPeriodLabel(record) {
  if (!record) return "-";
  switch (record.period_type) {
    case "Weekly":
      return `Week of ${formatDate(record.week_start_date)}`;
    case "Quarterly":
      return `${getQuarterLabel(record.quarter)} ${record.year}`;
    case "Monthly":
    default:
      return `${getMonthLabel(record.month)} ${record.year}`;
  }
}

// Monday of the current week, ISO date string — sane default for the
// week-start picker.
function getCurrentWeekStart() {
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

const EXPORT_COLUMNS = [
  { header: "Employee", accessor: getEmployeeName },
  { header: "Period Type", accessor: (r) => r.period_type },
  { header: "Period", accessor: getPeriodLabel },
  { header: "Target Customers", accessor: (r) => r.target_customer_count },
  { header: "Active", accessor: (r) => (r.is_active !== false ? "Yes" : "No") },
];

const PERIOD_TYPE_BADGE_CLASS = {
  Weekly: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Monthly: "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400",
  Quarterly: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
};

function getPeriodTypeBadgeClass(periodType) {
  return PERIOD_TYPE_BADGE_CLASS[periodType] || PERIOD_TYPE_BADGE_CLASS.Monthly;
}

/* =========================================================
   ICONS
========================================================= */

const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

const ActiveStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <rect x="3" y="4" width="14" height="13" rx="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2.5v3M13.5 2.5v3M3 8h14" />
  </svg>
);

const SumStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
  </svg>
);

const InactiveStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364L18.364 5.636" />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm dark:border-white/10 dark:from-primary-500/[0.06] dark:to-white/[0.02]">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HOVER TRIGGER + DETAILS CARD
========================================================= */

function HoverDetailsTrigger({ children, panel, align = "left" }) {
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
  };

  return (
    <div tabIndex={0} className="group/target-details relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>
      <div
        className={`
          pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150
          group-hover/target-details:pointer-events-auto group-hover/target-details:visible group-hover/target-details:opacity-100
          group-focus/target-details:pointer-events-auto group-focus/target-details:visible group-focus/target-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

function TargetDetailsCard({ record }) {
  const isActive = record?.is_active !== false;
  const employeeName = getEmployeeName(record);

  return (
    <div className="w-[320px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Target Details
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {employeeName}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Employee Code</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {record?.employee?.employee_code || "—"}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Cadence</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {record?.period_type}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Period</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {getPeriodLabel(record)}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Target</span>
          <span className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {record?.target_customer_count} customers
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-white/10" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">Created</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(record?.created_at)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Updated</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {formatDateTime(record?.updated_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function EmployeeTargetPage() {
  const { showToast } = useToast();
  const { exporting, exportToExcel, exportToPDF } = useTableExport();

  // CRM-department employees: view-only screen, scoped to their own
  // targets — not every CRM employee's.
  const { isCrmEmployee: readOnly } = useIsCrmEmployee();
  const user = getUser();

  const { data: incentiveSummary } = useIncentiveSummary(
    { year: new Date().getFullYear() },
    { enabled: readOnly }
  );

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useEmployeeTargets({
    page: 1,
    per_page: 1000,
    employee_id: readOnly ? user?.employee?.id : undefined,
  });

  const allRecords = allData?.items || [];

  const createTarget = useCreateEmployeeTarget();
  const updateTarget = useUpdateEmployeeTarget();
  const deactivateTarget = useDeactivateEmployeeTarget();
  const reactivateTarget = useReactivateEmployeeTarget();

  const employeeOptions = useCRMEmployeeOptions();

  /* -------------------------------------------------------
     STATE
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [periodTypeFilter, setPeriodTypeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("active");
  const [viewMode, setViewMode] = useState("card");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mutatingId, setMutatingId] = useState(null);

  const defaultFormState = {
    employee_id: "",
    period_type: "Monthly",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.floor(now.getMonth() / 3) + 1,
    week_start_date: getCurrentWeekStart(),
    target_customer_count: "",
  };

  const [formState, setFormState] = useState(defaultFormState);

  /* -------------------------------------------------------
     DERIVED
  ------------------------------------------------------- */

  const activeRecords = useMemo(
    () => allRecords.filter((r) => r.is_active !== false),
    [allRecords]
  );
  const inactiveRecords = useMemo(
    () => allRecords.filter((r) => r.is_active === false),
    [allRecords]
  );
  const totalTargetSum = useMemo(
    () => activeRecords.reduce((sum, r) => sum + (Number(r.target_customer_count) || 0), 0),
    [activeRecords]
  );

  const yearOptions = useMemo(() => {
    const years = new Set(allRecords.map((r) => r.year));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecords]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRecords.filter((record) => {
      const isActive = record.is_active !== false;

      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;
      if (periodTypeFilter && record.period_type !== periodTypeFilter) return false;
      if (yearFilter && String(record.year) !== String(yearFilter)) return false;

      if (normalizedSearch) {
        const haystack = [
          getEmployeeName(record),
          record.employee?.employee_code,
          getPeriodLabel(record),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [allRecords, search, activeFilter, periodTypeFilter, yearFilter]);

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      // Fall back to created_at so mixed period types still sort sensibly
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [filtered]);

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* -------------------------------------------------------
     HANDLERS
  ------------------------------------------------------- */

  const openAddForm = () => {
    if (readOnly) return;
    setEditingRecord(null);
    setFormState(defaultFormState);
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    if (readOnly) return;
    setEditingRecord(record);
    setFormState({
      employee_id: record.employee_id ?? record.employee?.id ?? "",
      period_type: record.period_type || "Monthly",
      year: record.year ?? now.getFullYear(),
      month: record.month ?? now.getMonth() + 1,
      quarter: record.quarter ?? Math.floor(now.getMonth() / 3) + 1,
      week_start_date: record.week_start_date ?? getCurrentWeekStart(),
      target_customer_count: record.target_customer_count ?? "",
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) return;

    const basePayload = {
      employee_id: Number(formState.employee_id),
      period_type: formState.period_type,
      target_customer_count: Number(formState.target_customer_count) || 0,
    };

    let periodPayload = {};
    if (formState.period_type === "Weekly") {
      const weekYear = formState.week_start_date
        ? new Date(formState.week_start_date).getFullYear()
        : now.getFullYear();
      periodPayload = {
        year: weekYear,
        week_start_date: formState.week_start_date,
        month: null,
        quarter: null,
      };
    } else if (formState.period_type === "Quarterly") {
      periodPayload = {
        year: Number(formState.year),
        quarter: Number(formState.quarter),
        month: null,
        week_start_date: null,
      };
    } else {
      periodPayload = {
        year: Number(formState.year),
        month: Number(formState.month),
        quarter: null,
        week_start_date: null,
      };
    }

    const payload = { ...basePayload, ...periodPayload };

    try {
      if (editingRecord) {
        await updateTarget.mutateAsync({ id: editingRecord.id, payload });
        showToast("Target updated", "success");
      } else {
        await createTarget.mutateAsync(payload);
        showToast("Target set", "success");
      }
      setFormOpen(false);
      setEditingRecord(null);
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save target (a target for this employee + period may already exist, or the employee isn't in the CRM department)",
        "error"
      );
    }
  };

  const confirmDeactivate = async () => {
    if (readOnly) return;
    if (!deleteTarget?.id) return;
    try {
      setMutatingId(deleteTarget.id);
      await deactivateTarget.mutateAsync(deleteTarget.id);
      showToast("Target deactivated", "success");
      setDeleteTarget(null);
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to deactivate target", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const handleReactivate = async (record) => {
    if (readOnly) return;
    try {
      setMutatingId(record.id);
      await reactivateTarget.mutateAsync(record.id);
      showToast("Target reactivated", "success");
      await refetch();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to reactivate target", "error");
    } finally {
      setMutatingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPeriodTypeFilter("");
    setYearFilter("");
    setActiveFilter("active");
    setPage(1);
  };

  const isSaving = createTarget.isPending || updateTarget.isPending;

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load employee targets.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <TargetIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employee Targets
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Weekly, Monthly, or Quarterly registered-customer quota per CRM employee
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            exporting={exporting}
            onExportExcel={() => exportToExcel(filtered, EXPORT_COLUMNS, "employee-targets")}
            onExportPDF={() => exportToPDF(filtered, EXPORT_COLUMNS, "employee-targets", "Employee Targets")}
          />
          {readOnly ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-500/15 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              View only
            </span>
          ) : (
          <Button type="button" onClick={openAddForm} className="h-10 w-full px-4 sm:w-auto">
            <span className="mr-1.5 text-lg">+</span>
            Set Target
          </Button>
          )}
        </div>
      </div>

      {/* MY INCENTIVE TIER — CRM employee */}
      {readOnly && incentiveSummary && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200/60 bg-gradient-to-br from-primary-50 to-white p-4 dark:border-primary-500/20 dark:from-primary-500/[0.08] dark:to-white/[0.02]">
          <div className="flex items-center gap-3">
            <span
              className={`chip ${
                incentiveSummary.current_tier === "Gold"
                  ? "chip-amber"
                  : incentiveSummary.current_tier === "Silver"
                  ? "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-white/10 dark:text-slate-200 dark:ring-white/15"
                  : incentiveSummary.current_tier === "Bronze"
                  ? "bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/25"
                  : "bg-slate-100 text-slate-500 ring-slate-500/15 dark:bg-white/10 dark:text-slate-400"
              }`}
            >
              {incentiveSummary.current_tier
                ? `${
                    incentiveSummary.current_tier === "Gold"
                      ? "🥇"
                      : incentiveSummary.current_tier === "Silver"
                      ? "🥈"
                      : "🥉"
                  } ${incentiveSummary.current_tier} tier`
                : "No tier yet"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {incentiveSummary.yearly
                ? `${incentiveSummary.yearly.registration_count} registrations · ${formatCurrency(
                    incentiveSummary.yearly.amount || 0
                  )} this year`
                : "No payout recorded yet"}
            </span>
          </div>
          <Link
            to="/crm/incentives"
            className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            View incentive dashboard →
          </Link>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<TargetIcon />} value={allRecords.length} label="Total Targets" tone="sky" />
        <StatCard icon={<ActiveStatIcon />} value={activeRecords.length} label="Active Targets" tone="emerald" />
        <StatCard icon={<InactiveStatIcon />} value={inactiveRecords.length} label="Inactive Targets" tone="red" />
        <StatCard icon={<SumStatIcon />} value={totalTargetSum} label="Total Active Quota" tone="amber" />
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m2.35-5.65a8 8 0 11-16 0 8 8 0 0116 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by employee name or code..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
              />
            </div>

            <select
              value={periodTypeFilter}
              onChange={(e) => {
                setPeriodTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[160px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">All Frequencies</option>
              {PERIOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[120px] dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {(search || periodTypeFilter || yearFilter || activeFilter !== "active") && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              {["active", "inactive", "all"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setActiveFilter(status);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                    activeFilter === status
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setViewMode("card");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "card"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Card
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("table");
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  viewMode === "table"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DATA */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No targets found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters.
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((record) => {
            const isActive = record.is_active !== false;
            const employeeName = getEmployeeName(record);

            return (
              <div
                key={record.id}
                className={`relative ${CARD_HEIGHT} min-w-0 overflow-visible rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg dark:bg-white/[0.04] ${
                  isActive ? "border-slate-200 dark:border-white/10" : "border-red-100 dark:border-red-900/30"
                }`}
              >
                <div className={`h-full p-4 pb-12 ${!isActive ? "opacity-75" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        {getInitials(employeeName)}
                      </div>
                      <div className="min-w-0">
                        <HoverDetailsTrigger align="left" panel={<TargetDetailsCard record={record} />}>
                          <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {employeeName}
                          </p>
                        </HoverDetailsTrigger>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {record.employee?.employee_code || `ID #${record.employee_id}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className={getPeriodTypeBadgeClass(record.period_type)}>
                        {record.period_type}
                      </Badge>
                      {!isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                          <span className="h-1 w-1 rounded-full bg-red-500" />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <CalendarIcon />
                    <span>{getPeriodLabel(record)}</span>
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-center dark:bg-white/[0.06]/60">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Target
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {record.target_customer_count}
                    </p>
                    <p className="text-[10px] text-slate-400">registered customers</p>
                  </div>
                </div>

                {!readOnly && (
                <div className="absolute inset-x-0 bottom-0 z-30 grid h-11 grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 dark:border-white/10 dark:bg-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => openEditForm(record)}
                    className="bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    Edit
                  </button>

                  {isActive ? (
                    <button
                      type="button"
                      disabled={mutatingId === record.id}
                      onClick={() => setDeleteTarget(record)}
                      className="bg-white text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-red-400"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={mutatingId === record.id}
                      onClick={() => handleReactivate(record)}
                      className="bg-white text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:bg-white/[0.04] dark:text-emerald-400"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Cadence</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((record) => {
                const isActive = record.is_active !== false;
                const employeeName = getEmployeeName(record);

                return (
                  <tr key={record.id} className="tbl-row">
                    <td className="px-4 py-3">
                      <HoverDetailsTrigger align="left" panel={<TargetDetailsCard record={record} />}>
                        <div className="flex cursor-pointer items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-[10px] font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            {getInitials(employeeName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{employeeName}</p>
                            <p className="text-[10px] text-slate-400">
                              {record.employee?.employee_code || `ID #${record.employee_id}`}
                            </p>
                          </div>
                        </div>
                      </HoverDetailsTrigger>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getPeriodTypeBadgeClass(record.period_type)}>
                        {record.period_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon />
                        {getPeriodLabel(record)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-primary-50 px-2.5 py-1 text-sm font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-400">
                        {record.target_customer_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      {readOnly ? (
                        <span className="block text-right text-xs text-slate-400">—</span>
                      ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => openEditForm(record)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a2.121 2.121 0 013 3l-9.9 9.9-4.137 1.034 1.034-4.137 9.9-9.9z" />
                          </svg>
                        </button>

                        {isActive ? (
                          <button
                            type="button"
                            title="Deactivate"
                            disabled={mutatingId === record.id}
                            onClick={() => setDeleteTarget(record)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Reactivate"
                            disabled={mutatingId === record.id}
                            onClick={() => handleReactivate(record)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8 8.5 8.5 0 017 4M20 4v5h-5M20 12a8 8 0 01-8 8 8.5 8.5 0 01-7-4M4 20v-5h5" />
                            </svg>
                          </button>
                        )}
                      </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06]"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06]"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT FORM */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                <TargetIcon />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingRecord ? "Edit Target" : "Set Employee Target"}
              </h2>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  CRM Employee
                </label>
                <select
                  required
                  value={formState.employee_id}
                  onChange={(e) => setFormState((s) => ({ ...s, employee_id: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">Select employee</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.value} value={employee.value}>
                      {employee.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Target Cadence
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PERIOD_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormState((s) => ({ ...s, period_type: type }))}
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                        formState.period_type === type
                          ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-400"
                          : "border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period-specific fields */}
              {formState.period_type === "Weekly" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Week Starting
                  </label>
                  <input
                    type="date"
                    required
                    value={formState.week_start_date}
                    onChange={(e) => setFormState((s) => ({ ...s, week_start_date: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                  />
                </div>
              )}

              {formState.period_type === "Monthly" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Month
                    </label>
                    <select
                      required
                      value={formState.month}
                      onChange={(e) => setFormState((s) => ({ ...s, month: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                    >
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Year
                    </label>
                    <input
                      type="number"
                      required
                      value={formState.year}
                      onChange={(e) => setFormState((s) => ({ ...s, year: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                    />
                  </div>
                </div>
              )}

              {formState.period_type === "Quarterly" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Quarter
                    </label>
                    <select
                      required
                      value={formState.quarter}
                      onChange={(e) => setFormState((s) => ({ ...s, quarter: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                    >
                      {QUARTER_OPTIONS.map((q) => (
                        <option key={q.value} value={q.value}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Year
                    </label>
                    <input
                      type="number"
                      required
                      value={formState.year}
                      onChange={(e) => setFormState((s) => ({ ...s, year: e.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Target Registered Customers
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formState.target_customer_count}
                  onChange={(e) => setFormState((s) => ({ ...s, target_customer_count: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Registrations above this number for the period are eligible for incentive calculation.
                  {formState.period_type !== "Monthly" && (
                    <> Currently, only Monthly targets feed into automatic incentive calculation.</>
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingRecord(null);
                  }}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 dark:border-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={isSaving} className="h-10 px-4">
                  {isSaving ? "Saving..." : editingRecord ? "Save Changes" : "Set Target"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate Target"
        message={
          deleteTarget
            ? `Deactivate the ${getPeriodLabel(deleteTarget)} target for ${getEmployeeName(deleteTarget)}?`
            : ""
        }
        confirmText="Deactivate"
        loading={mutatingId !== null}
      />
    </div>
  );
}