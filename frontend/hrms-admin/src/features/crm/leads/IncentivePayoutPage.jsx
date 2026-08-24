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
   HELPERS
========================================================= */

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

function getMonthLabel(month) {
  return MONTH_OPTIONS.find((m) => m.value === Number(month))?.label || month;
}

const STATUS_BADGE_CLASS = {
  Pending: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
  Approved: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  Invoiced: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

function getStatusBadgeClass(status) {
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.Pending;
}

const now = new Date();

/* =========================================================
   PAGE
========================================================= */

export default function IncentivePayoutPage() {
  const { showToast } = useToast();

  const [calcMonth, setCalcMonth] = useState(now.getMonth() + 1);
  const [calcYear, setCalcYear] = useState(now.getFullYear());

  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  const filtered = useMemo(() => {
    return allRecords.filter((record) => {
      if (monthFilter && String(record.month) !== String(monthFilter)) return false;
      if (yearFilter && String(record.year) !== String(yearFilter)) return false;
      if (statusFilter && record.status !== statusFilter) return false;
      return true;
    });
  }, [allRecords, monthFilter, yearFilter, statusFilter]);

  const yearOptions = useMemo(() => {
    const years = new Set(allRecords.map((r) => r.year));
    years.add(now.getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [allRecords]);

  const totals = useMemo(() => {
    return {
      pending: filtered.filter((r) => r.status === "Pending" || r.status === "Approved").length,
      totalAmount: filtered.reduce((sum, r) => sum + (Number(r.calculated_amount) || 0), 0),
    };
  }, [filtered]);

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Incentive Payouts
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Calculated monthly incentives for CRM employees who registered customers beyond their target
          </p>
        </div>

        <TableToolbar onRefresh={refetch} refreshing={isFetching} />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Payout Records</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm dark:border-amber-900/30 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Pending / Approved</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{totals.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/30 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totals.totalAmount)}
          </p>
        </div>
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
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              className="h-10 w-28 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <Button
            type="button"
            onClick={handleCalculate}
            disabled={calculateIncentives.isPending}
            className="h-10 px-4"
          >
            {calculateIncentives.isPending ? "Calculating..." : "Calculate Incentives"}
          </Button>
        </div>

        <p className="mt-2 text-[11px] text-slate-400">
          Scans all CRM-department employees, compares registered customers for the selected month against
          each employee's target, and records an incentive for anyone who exceeded it. Safe to re-run — existing
          records for the period are refreshed, not duplicated.
        </p>
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
            onChange={(e) => setYearFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Invoiced">Invoiced</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
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
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  No incentive records found. Run a calculation above for a specific period.
                </td>
              </tr>
            ) : (
              filtered
                .slice()
                .sort((a, b) => b.year - a.year || b.month - a.month)
                .map((record) => {
                  const employeeName = record.employee
                    ? `${record.employee.first_name || ""} ${record.employee.last_name || ""}`.trim()
                    : `Employee #${record.employee_id}`;

                  const canGenerateInvoice = record.status === "Approved";

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{employeeName}</p>
                        <p className="text-[10px] text-slate-400">{record.employee?.employee_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {getMonthLabel(record.month)} {record.year}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {record.target_customer_count}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {record.actual_customer_count}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        +{record.eligible_customer_count}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(record.calculated_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeClass(record.status)}>{record.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
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
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}