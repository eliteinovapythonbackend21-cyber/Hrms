import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useMonthlyLeaveRecord } from "./useLeaves";

import Button from "@/components/ui/Button";
import { getUser } from "@/utils/tokenHelpers";
import { useIsHrEmployee } from "@/hooks/useIsHrEmployee";
import { formatDate } from "@/utils/formatDate";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_STYLES = {
  Approved:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Rejected:
    "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

function StatusChip({ status, value }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        STATUS_STYLES[status] ||
        "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
      }`}
    >
      {status} · {value}d
    </span>
  );
}

function CategoryChip({ category, value }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        category === "Permission"
          ? "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
          : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
      }`}
    >
      {category} · {value}d
    </span>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function EmployeeRow({ row, canViewAll }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.04]"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-slate-400 transition ${open ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">
                {row.employee}
              </p>
              <p className="text-xs text-slate-400">
                {row.employee_code || "—"}
                {canViewAll && row.department ? ` · ${row.department}` : ""}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">
          {row.total_days}
        </td>
        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">
          {row.request_count}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {Object.entries(row.by_category || {}).map(([cat, val]) => (
              <CategoryChip key={cat} category={cat} value={val} />
            ))}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {Object.entries(row.by_status || {}).map(([st, val]) => (
              <StatusChip key={st} status={st} value={val} />
            ))}
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/60 dark:bg-white/[0.02]">
          <td colSpan={5} className="px-4 py-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="py-1.5 pr-4 font-medium">Type</th>
                    <th className="py-1.5 pr-4 font-medium">Category</th>
                    <th className="py-1.5 pr-4 font-medium">From</th>
                    <th className="py-1.5 pr-4 font-medium">To</th>
                    <th className="py-1.5 pr-4 font-medium">Days (in month)</th>
                    <th className="py-1.5 pr-4 font-medium">Status</th>
                    <th className="py-1.5 pr-4 font-medium">Reason</th>
                    <th className="py-1.5 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {row.leaves.map((lv) => (
                    <tr
                      key={lv.id}
                      className="border-t border-slate-100 dark:border-white/5"
                    >
                      <td className="py-1.5 pr-4 text-slate-700 dark:text-slate-200">
                        {lv.leave_type}
                      </td>
                      <td className="py-1.5 pr-4">{lv.category}</td>
                      <td className="py-1.5 pr-4">{formatDate(lv.from_date)}</td>
                      <td className="py-1.5 pr-4">{formatDate(lv.to_date)}</td>
                      <td className="py-1.5 pr-4">{lv.days_in_month}</td>
                      <td className="py-1.5 pr-4">{lv.status}</td>
                      <td className="py-1.5 pr-4 text-slate-500">
                        {lv.reason || "—"}
                      </td>
                      <td className="py-1.5 text-slate-500">
                        {lv.description || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MonthlyLeaveRecordPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const user = getUser();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const { isHrEmployee } = useIsHrEmployee();
  const canViewAll = isAdmin || isHrEmployee;

  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => now.getFullYear() - i),
    [now]
  );

  const { data, isLoading, isFetching, isError, refetch } = useMonthlyLeaveRecord({
    month,
    year,
  });

  const rows = data?.rows || [];
  const totals = data?.totals || { employees: 0, total_days: 0, requests: 0 };

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Monthly Leave Record
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {canViewAll
                ? "Per-employee leave taken for the selected month, with category and status breakdowns."
                : "Your leave taken for the selected month, with category and status breakdowns."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {MONTHS.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <Button variant="secondary" onClick={() => refetch()}>
              Refresh
            </Button>

            <Link to="/leaves">
              <Button variant="secondary">Back to Leaves</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={canViewAll ? "Employees with leave" : "Records"}
          value={totals.employees}
          hint={`${MONTHS[month - 1]} ${year}`}
        />
        <KpiCard label="Total leave days" value={totals.total_days} />
        <KpiCard label="Leave requests" value={totals.requests} />
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {MONTHS[month - 1]} {year}
          </h2>
          {isFetching && (
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              Updating
            </span>
          )}
        </div>

        {isError ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">
            Unable to load the monthly leave record.
          </div>
        ) : isLoading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-white">
              No leave recorded
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Nothing overlaps {MONTHS[month - 1]} {year}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03]">
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 text-center font-semibold">Days</th>
                  <th className="px-4 py-3 text-center font-semibold">Requests</th>
                  <th className="px-4 py-3 font-semibold">By Category</th>
                  <th className="px-4 py-3 font-semibold">By Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <EmployeeRow
                    key={row.employee_id}
                    row={row}
                    canViewAll={canViewAll}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
