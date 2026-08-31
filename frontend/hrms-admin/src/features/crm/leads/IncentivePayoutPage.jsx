import { useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import TableToolbar from "@/components/table/TableToolbar";
import { useToast } from "@/components/feedback/Toast";

import {
  useEmployeeIncentives,
  useCalculateEmployeeIncentives,
} from "./useEmployeeIncentives";

import { useGenerateIncentiveInvoice } from "../invoices/useInvoices";

import { formatCurrency } from "@/utils/formatCurrency";

/* =========================================================
   CONSTANTS
========================================================= */

const CARD_PAGE_SIZE = 6;
const TABLE_PAGE_SIZE = 10;

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

const STATUS_BADGE_CLASS = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  Approved: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Invoiced: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

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

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Pending;
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

/* =========================================================
   ICONS
========================================================= */

const PayoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v10M15 9c-.5-1-1.5-1.5-3-1.5-1.7 0-3 .8-3 2s1.2 1.8 3 2.2 3 .9 3 2.3-1.3 2.3-3 2.3c-1.5 0-2.6-.5-3.2-1.5" />
  </svg>
);

const PendingStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
  </svg>
);

const AmountStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M9 10.5c0-1 1-1.5 3-1.5s3 .8 3 2-1.3 1.7-3 2-3 1-3 2 1 2 3 2 3-.5 3-1.5" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const PaidStatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m8 12 2.5 2.5L16 9" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4">
    <rect x="3" y="4" width="14" height="13" rx="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2.5v3M13.5 2.5v3M3 8h14" />
  </svg>
);

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({ icon, value, label, tone = "sky" }) {
  const tones = {
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
    <div tabIndex={0} className="group/payout-details relative inline-flex max-w-full outline-none">
      <div className="max-w-full">{children}</div>
      <div
        className={`
          pointer-events-none invisible absolute top-full z-[100] mt-2 opacity-0 transition-all duration-150
          group-hover/payout-details:pointer-events-auto group-hover/payout-details:visible group-hover/payout-details:opacity-100
          group-focus/payout-details:pointer-events-auto group-focus/payout-details:visible group-focus/payout-details:opacity-100
          ${alignClasses[align]}
        `}
      >
        {panel}
      </div>
    </div>
  );
}

function PayoutDetailsCard({ record }) {
  const employeeName = getEmployeeName(record);

  return (
    <div className="w-[320px] max-w-[calc(100vw-32px)] rounded-xl border border-slate-200 border-t-2 border-t-primary-500 bg-white p-4 text-left shadow-xl dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Payout Details
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-800 dark:text-white">
            {employeeName}
          </p>
        </div>
        <Badge className={getStatusBadgeClass(record?.status)}>{record?.status}</Badge>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="space-y-2.5">
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Employee Code</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {record?.employee?.employee_code || "—"}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Period</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {getMonthLabel(record?.month)} {record?.year}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Target</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {record?.target_customer_count}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Actual</span>
          <span className="text-right text-xs font-medium text-slate-700 dark:text-slate-200">
            {record?.actual_customer_count}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Extra</span>
          <span className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            +{record?.eligible_customer_count}
          </span>
        </div>
        <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
          <span className="text-xs text-slate-400">Amount</span>
          <span className="break-words text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
            {formatCurrency(record?.calculated_amount)}
          </span>
        </div>
      </div>

      <div className="my-3 border-t border-slate-100 dark:border-slate-700" />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-slate-400">Calculated</p>
          <p className="mt-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-200">
            {record?.calculation_date || "—"}
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
   PROGRESS BAR (target vs actual)
========================================================= */

function TargetProgressBar({ target, actual }) {
  const max = Math.max(target, actual, 1);
  const targetPct = Math.min(100, (target / max) * 100);
  const actualPct = Math.min(100, (actual / max) * 100);

  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300 dark:bg-slate-600" style={{ width: `${targetPct}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${actualPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Target: {target}</span>
        <span>Actual: {actual}</span>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function IncentivePayoutPage() {
  const { showToast } = useToast();

  const [calcMonth, setCalcMonth] = useState(now.getMonth() + 1);
  const [calcYear, setCalcYear] = useState(now.getFullYear());

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [page, setPage] = useState(1);

  const [generatingId, setGeneratingId] = useState(null);

  const {
    data: allData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useEmployeeIncentives({ page: 1, per_page: 1000 });

  const allRecords = allData?.items || [];

  const calculateIncentives = useCalculateEmployeeIncentives();
  const generateInvoice = useGenerateIncentiveInvoice();

  /* -------------------------------------------------------
     DERIVED
  ------------------------------------------------------- */

  const yearOptions = useMemo(() => {
    const years = new Set(allRecords.map((r) => r.year));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecords]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRecords.filter((record) => {
      if (monthFilter && String(record.month) !== String(monthFilter)) return false;
      if (yearFilter && String(record.year) !== String(yearFilter)) return false;
      if (statusFilter && record.status !== statusFilter) return false;

      if (normalizedSearch) {
        const haystack = [getEmployeeName(record), record.employee?.employee_code]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [allRecords, search, monthFilter, yearFilter, statusFilter]);

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => b.year - a.year || b.month - a.month),
    [filtered]
  );

  const totals = useMemo(() => {
    return {
      pending: filtered.filter((r) => r.status === "Pending" || r.status === "Approved").length,
      paid: filtered.filter((r) => r.status === "Paid").length,
      totalAmount: filtered.reduce((sum, r) => sum + (Number(r.calculated_amount) || 0), 0),
    };
  }, [filtered]);

  const pageSize = viewMode === "card" ? CARD_PAGE_SIZE : TABLE_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  /* -------------------------------------------------------
     HANDLERS
  ------------------------------------------------------- */

  const handleCalculate = async () => {
    try {
      const result = await calculateIncentives.mutateAsync({ month: calcMonth, year: calcYear });
      const count = result?.data?.data?.length ?? 0;
      showToast(`Calculated incentives for ${count} employee(s)`, "success");
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to calculate incentives",
        "error"
      );
    }
  };

  const handleGenerateInvoice = async (record) => {
    try {
      setGeneratingId(record.id);
      await generateInvoice.mutateAsync(record.id);
      showToast("Incentive invoice generated", "success");
      await refetch();
    } catch (error) {
      showToast(
        error?.response?.data?.message || error?.message || "Failed to generate invoice",
        "error"
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setMonthFilter("");
    setYearFilter("");
    setStatusFilter("");
    setPage(1);
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
        Failed to load incentive payouts.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <PayoutIcon />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Incentive Payouts
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Monthly incentives for CRM employees who registered customers beyond their target
            </p>
          </div>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<PayoutIcon />} value={filtered.length} label="Total Payout Records" tone="sky" />
        <StatCard icon={<PendingStatIcon />} value={totals.pending} label="Pending / Approved" tone="amber" />
        <StatCard icon={<PaidStatIcon />} value={totals.paid} label="Paid" tone="emerald" />
        <StatCard icon={<AmountStatIcon />} value={formatCurrency(totals.totalAmount)} label="Total Amount" tone="emerald" />
      </div>

      {/* CALCULATE */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Month
            </label>
            <select
              value={calcMonth}
              onChange={(e) => setCalcMonth(Number(e.target.value))}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              value={calcYear}
              onChange={(e) => setCalcYear(Number(e.target.value))}
              className="h-10 w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <Button
            type="button"
            onClick={handleCalculate}
            disabled={calculateIncentives.isPending}
            className="h-10 w-full px-4 sm:w-auto"
          >
            {calculateIncentives.isPending ? "Calculating..." : "Calculate Incentives"}
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          Scans all CRM-department employees, compares registered customers for the selected month against
          each employee's target, and records an incentive for anyone who exceeded it. Safe to re-run —
          existing records for the period are refreshed, not duplicated.
        </p>
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[120px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-[160px] dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Invoiced">Invoiced</option>
              <option value="Paid">Paid</option>
            </select>

            {(search || monthFilter || yearFilter || statusFilter) && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
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
            </div>
          </div>
        </div>
      </div>

      {/* DATA */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading...</div>
      ) : paged.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">No incentive records found</h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            No records match your current search or filters. Run a calculation above for a specific period.
          </p>
        </div>
      ) : viewMode === "table" ? (
        <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="tbl-head border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Actual</th>
                <th className="px-4 py-3 font-medium">Extra</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paged.map((record) => {
                const employeeName = getEmployeeName(record);
                const canGenerateInvoice = record.status === "Approved";

                return (
                  <tr key={record.id} className="tbl-row">
                    <td className="px-4 py-3">
                      <HoverDetailsTrigger align="left" panel={<PayoutDetailsCard record={record} />}>
                        <div className="flex cursor-pointer items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-[10px] font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                            {getInitials(employeeName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{employeeName}</p>
                            <p className="text-[10px] text-slate-400">{record.employee?.employee_code}</p>
                          </div>
                        </div>
                      </HoverDetailsTrigger>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon />
                        {getMonthShort(record.month)} {record.year}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {record.target_customer_count}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {record.actual_customer_count}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                        +{record.eligible_customer_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      {formatCurrency(record.calculated_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadgeClass(record.status)}>{record.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        {canGenerateInvoice ? (
                          <button
                            type="button"
                            disabled={generatingId === record.id}
                            onClick={() => handleGenerateInvoice(record)}
                            className="whitespace-nowrap text-xs font-semibold text-primary-600 hover:underline disabled:opacity-40 dark:text-primary-400"
                          >
                            {generatingId === record.id ? "Generating..." : "Generate Invoice"}
                          </button>
                        ) : (
                          <span className="whitespace-nowrap text-xs text-slate-400">
                            {record.status === "Pending" ? "Not approved yet" : "Invoice already generated"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.map((record) => {
            const employeeName = getEmployeeName(record);
            const canGenerateInvoice = record.status === "Approved";

            return (
              <div
                key={record.id}
                className="flex min-w-0 flex-col overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-bold text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                        {getInitials(employeeName)}
                      </div>
                      <div className="min-w-0">
                        <HoverDetailsTrigger align="left" panel={<PayoutDetailsCard record={record} />}>
                          <p className="max-w-[180px] cursor-pointer truncate text-sm font-semibold text-slate-900 dark:text-white">
                            {employeeName}
                          </p>
                        </HoverDetailsTrigger>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <CalendarIcon />
                          {getMonthLabel(record.month)} {record.year}
                        </div>
                      </div>
                    </div>

                    <Badge className={getStatusBadgeClass(record.status)}>{record.status}</Badge>
                  </div>

                  <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                  <TargetProgressBar target={record.target_customer_count} actual={record.actual_customer_count} />

                  <div className="mt-3 flex flex-1 items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-3 dark:bg-emerald-500/10">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Extra Customers
                      </p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        +{record.eligible_customer_count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Amount
                      </p>
                      <p className="break-words text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(record.calculated_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-2.5 text-center dark:border-slate-800">
                  {canGenerateInvoice ? (
                    <button
                      type="button"
                      disabled={generatingId === record.id}
                      onClick={() => handleGenerateInvoice(record)}
                      className="text-xs font-semibold text-primary-600 hover:underline disabled:opacity-40 dark:text-primary-400"
                    >
                      {generatingId === record.id ? "Generating..." : "Generate Invoice"}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {record.status === "Pending" ? "Not approved yet" : "Invoice already generated"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}