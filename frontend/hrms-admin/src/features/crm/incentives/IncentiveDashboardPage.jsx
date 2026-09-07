import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import TableToolbar from "@/components/table/TableToolbar";
import { useTableExport } from "@/hooks/useTableExport";
import { useFileDownload } from "@/hooks/useFileDownload";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { getUser } from "@/utils/tokenHelpers";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";
import { crmApi } from "@/api/crm.api";

import {
  useRunIncentives,
  useRunPayoutNow,
  useWeeklyIncentives,
  useMonthlyPayouts,
  useQuarterlyIncentives,
  useYearlyPayouts,
  useIncentiveSummary,
  useIncentiveInvoiceList,
  useGenerateIncentiveInvoice,
} from "./useIncentives";

/* =========================================================
   CONSTANTS
========================================================= */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PLAN_TONE = {
  Silver: "text-slate-600 dark:text-slate-300",
  Gold: "text-amber-600 dark:text-amber-400",
  Diamond: "text-sky-600 dark:text-sky-400",
};

// Silver/Gold/Diamond per-plan incentive columns, shared by the Weekly,
// Monthly and Quarterly tabs — reads WeeklyIncentive/MonthlyPayout's
// `breakdown` (or the live-computed Quarterly row's) so the plan-based
// split is visible alongside the combined total, not just the total.
const PLAN_COLUMNS = ["Silver", "Gold", "Diamond"].map((plan) => ({
  key: `plan_${plan}`,
  label: plan,
  align: "right",
  render: (r) => (
    <span className={`font-medium ${PLAN_TONE[plan]}`}>
      {formatCurrency(r.breakdown?.[plan] || 0)}
    </span>
  ),
}));

function StatusPill({ value }) {
  const map = {
    Pending: "chip-amber",
    Approved: "chip-emerald",
    Paid: "chip-emerald",
    Invoiced: "chip-blue",
    Unpaid: "chip-amber",
    Overdue: "chip-rose",
  };
  return <span className={`chip ${map[value] || "chip-primary"}`}>{value || "—"}</span>;
}

/* =========================================================
   SIMPLE TABLE
========================================================= */

function DataGrid({ columns, rows, empty }) {
  if (!rows?.length) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        {empty}
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="tbl-head">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {rows.map((row, i) => (
              <tr key={row.id ?? i} className="tbl-row">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 ${
                      c.align === "right" ? "text-right" : ""
                    }`}
                  >
                    {c.render ? c.render(row) : row[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================
   RECORD CARD — same `columns` config DataGrid uses (label +
   optional render(row)), just laid out as a card instead of a
   table row. Keeps every tab's card view in sync with its table
   view for free — no separate per-tab card markup to maintain.
========================================================= */

function RecordCard({ row, columns }) {
  const titleCol = columns.find((c) => c.key === "emp") || columns[0];
  const statusCol = columns.find((c) => c.key === "status");
  const amountCol = columns.find((c) => c.key === "amount");
  const actionsCol = columns.find((c) => c.key === "actions");
  const restCols = columns.filter(
    (c) => c !== titleCol && c !== statusCol && c !== amountCol && c !== actionsCol
  );

  const renderVal = (c) => (c.render ? c.render(row) : row[c.key] ?? "—");

  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
          {renderVal(titleCol)}
        </p>
        {statusCol && renderVal(statusCol)}
      </div>

      {restCols.length > 0 && (
        <>
          <div className="my-3 border-t border-slate-100 dark:border-white/[0.06]" />
          <div className="flex-1 space-y-2 text-xs">
            {restCols.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-slate-400">{c.label}</span>
                <span className="truncate text-right font-medium text-slate-700 dark:text-slate-200">
                  {renderVal(c)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {amountCol && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/[0.04]">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {amountCol.label}
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {row.amount != null ? formatCurrency(row.amount) : "—"}
          </span>
        </div>
      )}

      {actionsCol && <div className="mt-3 flex justify-end">{renderVal(actionsCol)}</div>}
    </div>
  );
}

function CardGrid({ columns, rows, empty }) {
  if (!rows?.length) {
    return (
      <div className="card p-10 text-center text-sm text-slate-500 dark:text-slate-400">
        {empty}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row, i) => (
        <RecordCard key={row.id ?? i} row={row} columns={columns} />
      ))}
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function IncentiveDashboardPage() {
  const { showToast } = useToast();
  const { downloadBlob } = useFileDownload();
  const user = getUser();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const { isCrmEmployee } = useIsCrmEmployee();
  const canManage = isAdmin;

  const now = new Date();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(currentQuarter);
  const [tab, setTab] = useState("weekly");
  const [viewMode, setViewMode] = useState("table");

  const { data: summary } = useIncentiveSummary(
    { year },
    { enabled: isCrmEmployee }
  );

  const weekly = useWeeklyIncentives({ year, month, per_page: 500 });
  const monthly = useMonthlyPayouts({ year, per_page: 500 });
  const quarterly = useQuarterlyIncentives(
    { year, quarter },
    { enabled: tab === "quarterly" }
  );
  const yearly = useYearlyPayouts({ year, per_page: 500 });
  const invoices = useIncentiveInvoiceList({ per_page: 500 });

  const runMut = useRunIncentives();
  const runPayoutMut = useRunPayoutNow();
  const genMut = useGenerateIncentiveInvoice();

  const allWeeklyRows = weekly.data?.items || [];
  const monthlyRows = monthly.data?.items || [];
  const quarterlyRows = quarterly.data?.items || [];
  const yearlyRows = yearly.data?.items || [];
  const invoiceRows = invoices.data?.items || [];

  // Weekly tab shows the CURRENT week only, not every week of the
  // selected month — the month/year pickers still drive Monthly/Yearly.
  const currentWeekStart = useMemo(() => {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().slice(0, 10);
  }, [now]);

  const weeklyRows = useMemo(
    () => allWeeklyRows.filter((r) => r.week_start_date === currentWeekStart),
    [allWeeklyRows, currentWeekStart]
  );

  // 1st/2nd/3rd/4th-week breakdown per employee for the Monthly tab —
  // built from the same per-month WeeklyIncentive rows already fetched
  // above (weekly query is scoped to {year, month}, same as this tab).
  const weekBreakdownByEmployee = useMemo(() => {
    const map = {};
    const sorted = allWeeklyRows
      .slice()
      .sort((a, b) => new Date(a.week_start_date) - new Date(b.week_start_date));
    for (const row of sorted) {
      if (!map[row.employee_id]) map[row.employee_id] = [];
      map[row.employee_id].push(row);
    }
    return map;
  }, [allWeeklyRows]);

  // 1st/2nd/3rd-month breakdown per employee for the Quarterly tab — built
  // from monthlyRows (already fetched for the whole selected year).
  const quarterMonths = useMemo(() => {
    const start = (quarter - 1) * 3 + 1;
    return [start, start + 1, start + 2];
  }, [quarter]);

  const monthBreakdownByEmployee = useMemo(() => {
    const map = {};
    for (const employeeMonth of quarterMonths) {
      for (const row of monthlyRows) {
        if (row.month !== employeeMonth) continue;
        if (!map[row.employee_id]) map[row.employee_id] = [];
        map[row.employee_id].push(row);
      }
    }
    return map;
  }, [monthlyRows, quarterMonths]);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y + 1, y, y - 1, y - 2];
  }, [now]);

  const runNow = async () => {
    try {
      const res = await runMut.mutateAsync({ month, year });
      showToast(
        res.data?.message ||
          `Recomputed ${res.data?.data?.employees_processed ?? ""} employee(s)`,
        "success"
      );
    } catch (e) {
      showToast(e?.response?.data?.message || "Run failed", "error");
    }
  };

  const runPayoutNow = async () => {
    try {
      const res = await runPayoutMut.mutateAsync({ month, year });
      showToast(res.data?.message || "Payout run complete", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Payout run failed", "error");
    }
  };

  const generate = async (payoutId) => {
    try {
      await genMut.mutateAsync(payoutId);
      showToast("Incentive invoice generated", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Invoice failed", "error");
    }
  };

  const invoiceReportMut = useMutation({
    mutationFn: async () => {
      const res = await crmApi.incentives.invoicesReport({ month, year });
      downloadBlob(res, `incentive_invoices_${year}_${String(month).padStart(2, "0")}.xlsx`);
      return res;
    },
    onSuccess: () => showToast(`${MONTHS[month - 1]} ${year} invoices downloaded`, "success"),
    onError: (e) =>
      showToast(e?.response?.data?.message || "Failed to download invoices", "error"),
  });

  const downloadMonthlyInvoices = () => invoiceReportMut.mutate();

  const empName = (r) =>
    r.employee
      ? `${r.employee.first_name || ""} ${r.employee.last_name || ""}`.trim() ||
        r.employee.employee_code
      : `#${r.employee_id}`;

  const TABS = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "yearly", label: "Yearly" },
    { id: "invoices", label: "Invoices" },
  ];

  // Export always reflects whichever tab is currently active — the row
  // shapes differ per tab, so both the columns and the rows sent to
  // export are picked from this map.
  const EXPORT_COLUMNS_BY_TAB = {
    weekly: [
      { header: "Employee", accessor: empName },
      { header: "Week Start", accessor: (r) => formatDate(r.week_start_date) },
      { header: "Week End", accessor: (r) => formatDate(r.week_end_date) },
      { header: "Registrations", accessor: (r) => r.registration_count },
      { header: "Target", accessor: (r) => r.target_count },
      { header: "Incentive", accessor: (r) => r.eligible_count },
      { header: "Silver", accessor: (r) => r.breakdown?.Silver || 0 },
      { header: "Gold", accessor: (r) => r.breakdown?.Gold || 0 },
      { header: "Diamond", accessor: (r) => r.breakdown?.Diamond || 0 },
      { header: "Incentive Amount", accessor: (r) => r.amount },
    ],
    monthly: [
      { header: "Employee", accessor: empName },
      { header: "Period", accessor: (r) => `${MONTHS[r.month - 1]} ${r.year}` },
      { header: "Weeks", accessor: (r) => r.week_count },
      { header: "Registrations", accessor: (r) => r.registration_count },
      { header: "Target", accessor: (r) => r.target_count },
      { header: "Incentive", accessor: (r) => r.eligible_count },
      { header: "Silver", accessor: (r) => r.breakdown?.Silver || 0 },
      { header: "Gold", accessor: (r) => r.breakdown?.Gold || 0 },
      { header: "Diamond", accessor: (r) => r.breakdown?.Diamond || 0 },
      { header: "Payout", accessor: (r) => r.amount },
      { header: "Status", accessor: (r) => r.status },
    ],
    quarterly: [
      { header: "Employee", accessor: empName },
      { header: "Period", accessor: (r) => `Q${r.quarter} ${r.year}` },
      { header: "Registrations", accessor: (r) => r.registration_count },
      { header: "Target", accessor: (r) => r.target_count },
      { header: "Incentive", accessor: (r) => r.eligible_count },
      { header: "Silver", accessor: (r) => r.breakdown?.Silver || 0 },
      { header: "Gold", accessor: (r) => r.breakdown?.Gold || 0 },
      { header: "Diamond", accessor: (r) => r.breakdown?.Diamond || 0 },
      { header: "Amount", accessor: (r) => r.amount },
    ],
    yearly: [
      { header: "Employee", accessor: empName },
      { header: "Year", accessor: (r) => r.year },
      { header: "Months", accessor: (r) => r.month_count },
      { header: "Registrations", accessor: (r) => r.registration_count },
      { header: "Incentive", accessor: (r) => r.eligible_count },
      { header: "Total Payout", accessor: (r) => r.amount },
    ],
    invoices: [
      { header: "Invoice #", accessor: (r) => r.invoice_number },
      { header: "Employee", accessor: empName },
      { header: "Amount", accessor: (r) => r.amount },
      { header: "Due Date", accessor: (r) => (r.due_date ? formatDate(r.due_date) : "") },
      { header: "Status", accessor: (r) => r.status },
    ],
  };

  const ROWS_BY_TAB = {
    weekly: weeklyRows,
    monthly: monthlyRows.filter((r) => r.month === month),
    quarterly: quarterlyRows,
    yearly: yearlyRows,
    invoices: invoiceRows,
  };

  const { exporting, exportToExcel, exportToPDF } = useTableExport();

  // Current month's registration progress toward that month's Monthly
  // target (Weekly=10/Monthly=40/Quarterly=120 by default, or a per-employee
  // EmployeeTarget override — snapshotted onto the payout row itself so this
  // never has to guess), for the CRM employee's own "My Incentive" summary.
  const currentMonthRow = (summary?.monthly || []).find(
    (m) => m.month === month && m.year === year
  );
  const currentMonthCount = currentMonthRow?.registration_count ?? 0;
  const currentMonthTarget = currentMonthRow?.target_count || 40;

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CRM Incentives
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Weekly/Monthly/Quarterly targets (10 / 40 / 120) — once an
            employee clears at least 10 registrations and hits their plan's
            eligibility share (Silver 50% · Gold 30% · Diamond 20% of
            target), every registration past the period target earns 6% of
            that membership plan's price
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tab === "quarterly" ? (
            <select
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <TableToolbar
            onRefresh={() => {
              weekly.refetch();
              monthly.refetch();
              quarterly.refetch();
              yearly.refetch();
              invoices.refetch();
            }}
            refreshing={weekly.isFetching}
            exporting={exporting}
            onExportExcel={() =>
              exportToExcel(ROWS_BY_TAB[tab], EXPORT_COLUMNS_BY_TAB[tab], `crm-incentives-${tab}`)
            }
            onExportPDF={() =>
              exportToPDF(
                ROWS_BY_TAB[tab],
                EXPORT_COLUMNS_BY_TAB[tab],
                `crm-incentives-${tab}`,
                `CRM Incentives — ${TABS.find((t) => t.id === tab)?.label}`
              )
            }
          />

          {canManage && (
            <Button
              type="button"
              variant="secondary"
              onClick={runNow}
              isLoading={runMut.isPending}
              className="h-10 px-4"
            >
              Run for {MONTHS[month - 1]} {year}
            </Button>
          )}

          {canManage && (
            <Button
              type="button"
              onClick={runPayoutNow}
              isLoading={runPayoutMut.isPending}
              title="Invoice + settle this period now (via Razorpay when configured, else an internal settlement) — same as the automated 20th-of-the-month run, on demand"
              className="h-10 px-4"
            >
              Run Payout Now
            </Button>
          )}
        </div>
      </div>

      {/* CRM EMPLOYEE — MY INCENTIVE PROGRESS */}
      {isCrmEmployee && summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="stat-tile stat-tile-primary p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registrations — {MONTHS[month - 1]} {year}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {currentMonthCount}
              <span className="ml-1 text-sm font-medium text-slate-400">
                / {currentMonthTarget}+
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{
                  width: `${Math.min(
                    100,
                    (currentMonthCount / currentMonthTarget) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
          <div className="stat-tile stat-tile-success p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              This month's incentive
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(currentMonthRow?.amount || 0)}
            </p>
          </div>
          <div className="stat-tile stat-tile-info p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              This year's payout
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(summary.yearly?.amount || 0)}
            </p>
          </div>
        </div>
      )}

      {/* TABS + VIEW TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t.id
                  ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
          <button
            type="button"
            onClick={() => setViewMode("card")}
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
            onClick={() => setViewMode("table")}
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

      {tab === "weekly" && (() => {
        const columns = [
          { key: "emp", label: "Employee", render: empName },
          {
            key: "week",
            label: "Week",
            render: (r) =>
              `${formatDate(r.week_start_date)} – ${formatDate(
                r.week_end_date
              )}`,
          },
          { key: "registration_count", label: "Regs", align: "right" },
          { key: "target_count", label: "Target", align: "right" },
          { key: "eligible_count", label: "Incentive", align: "right" },
          ...PLAN_COLUMNS,
          {
            key: "amount",
            label: "Incentive Amount",
            align: "right",
            render: (r) => (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(r.amount)}
              </span>
            ),
          },
        ];
        const empty = `No incentive activity for the current week yet. ${
          canManage ? "Run the calculation above." : ""
        }`;
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={weeklyRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={weeklyRows} columns={columns} />
        );
      })()}

      {tab === "monthly" && (() => {
        // Selecting a month narrows this tab to just that month's row per
        // employee, with a 1st/2nd/3rd/4th-week breakdown alongside it.
        const monthRows = monthlyRows.filter((r) => r.month === month);

        // Date range for each week-of-month, read off whichever employee
        // actually has that week's row (weeks are the same calendar dates
        // for everyone in a given month) — used to label the column with
        // the real date range instead of just "1st Week".
        const weekDatesByIndex = [0, 1, 2, 3].map((idx) => {
          for (const rows of Object.values(weekBreakdownByEmployee)) {
            if (rows[idx]) return rows[idx];
          }
          return null;
        });

        const weekColumns = [1, 2, 3, 4].map((weekIndex) => {
          const ordinal = weekIndex === 1 ? "1st" : weekIndex === 2 ? "2nd" : weekIndex === 3 ? "3rd" : "4th";
          const dateRow = weekDatesByIndex[weekIndex - 1];
          const dateLabel = dateRow
            ? `${formatDate(dateRow.week_start_date)} – ${formatDate(dateRow.week_end_date)}`
            : null;
          return {
            key: `week_${weekIndex}`,
            label: dateLabel ? `${ordinal} Week (${dateLabel})` : `${ordinal} Week`,
            align: "right",
            render: (r) => {
              const weeks = weekBreakdownByEmployee[r.employee_id] || [];
              const week = weeks[weekIndex - 1];
              return (
                <span className="text-slate-600 dark:text-slate-300">
                  {week ? week.registration_count : "—"}
                </span>
              );
            },
          };
        });

        const columns = [
          { key: "emp", label: "Employee", render: empName },
          {
            key: "period",
            label: "Period",
            render: (r) => `${MONTHS[r.month - 1]} ${r.year}`,
          },
          ...weekColumns,
          { key: "registration_count", label: "Total Regs", align: "right" },
          { key: "target_count", label: "Target", align: "right" },
          { key: "eligible_count", label: "Incentive", align: "right" },
          ...PLAN_COLUMNS,
          {
            key: "amount",
            label: "Payout",
            align: "right",
            render: (r) => (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(r.amount)}
              </span>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusPill value={r.status} />,
          },
          ...(canManage
            ? [
                {
                  key: "actions",
                  label: "",
                  align: "right",
                  render: (r) =>
                    Number(r.amount) > 0 && r.status !== "Invoiced" ? (
                      <button
                        type="button"
                        disabled={genMut.isPending}
                        onClick={() => generate(r.id)}
                        className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-500/15 transition hover:bg-blue-100 disabled:opacity-40 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20"
                      >
                        Generate invoice
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    ),
                },
              ]
            : []),
        ];
        const empty = `No monthly payouts for ${MONTHS[month - 1]} ${year}.`;
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={monthRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={monthRows} columns={columns} />
        );
      })()}

      {tab === "quarterly" && (() => {
        const monthColumns = [0, 1, 2].map((offset) => ({
          key: `qmonth_${offset}`,
          label: `${offset === 0 ? "1st" : offset === 1 ? "2nd" : "3rd"} Month`,
          align: "right",
          render: (r) => {
            const monthsForEmployee = monthBreakdownByEmployee[r.employee_id] || [];
            const monthRow = monthsForEmployee[offset];
            return (
              <span className="text-slate-600 dark:text-slate-300">
                {monthRow ? `${MONTHS[monthRow.month - 1].slice(0, 3)}: ${monthRow.registration_count}` : "—"}
              </span>
            );
          },
        }));

        const columns = [
          { key: "emp", label: "Employee", render: empName },
          {
            key: "period",
            label: "Period",
            render: (r) => `Q${r.quarter} ${r.year}`,
          },
          ...monthColumns,
          { key: "registration_count", label: "Total Regs", align: "right" },
          { key: "target_count", label: "Target", align: "right" },
          { key: "eligible_count", label: "Incentive", align: "right" },
          ...PLAN_COLUMNS,
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (r) => (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(r.amount)}
              </span>
            ),
          },
        ];
        const empty = `No quarterly figures for Q${quarter} ${year} yet.`;
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={quarterlyRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={quarterlyRows} columns={columns} />
        );
      })()}

      {tab === "yearly" && (() => {
        const columns = [
          { key: "emp", label: "Employee", render: empName },
          { key: "year", label: "Year", align: "right" },
          { key: "month_count", label: "Months", align: "right" },
          { key: "registration_count", label: "Regs", align: "right" },
          { key: "eligible_count", label: "Incentive", align: "right" },
          {
            key: "amount",
            label: "Total payout",
            align: "right",
            render: (r) => (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(r.amount)}
              </span>
            ),
          },
        ];
        const empty = `No yearly payouts for ${year}.`;
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={yearlyRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={yearlyRows} columns={columns} />
        );
      })()}

      {tab === "invoices" && (() => {
        const columns = [
          { key: "invoice_number", label: "Invoice #" },
          { key: "emp", label: "Employee", render: empName },
          {
            key: "amount",
            label: "Amount",
            align: "right",
            render: (r) => formatCurrency(r.amount),
          },
          {
            key: "due_date",
            label: "Due",
            render: (r) => (r.due_date ? formatDate(r.due_date) : "—"),
          },
          {
            key: "status",
            label: "Status",
            render: (r) => <StatusPill value={r.status} />,
          },
        ];
        const empty = "No incentive invoices yet.";
        return (
          <div className="space-y-3">
            {canManage && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={downloadMonthlyInvoices}
                  isLoading={invoiceReportMut.isPending}
                  className="h-9 px-3 text-xs"
                >
                  Download {MONTHS[month - 1]} {year} Invoices
                </Button>
              </div>
            )}
            {viewMode === "card" ? (
              <CardGrid empty={empty} rows={invoiceRows} columns={columns} />
            ) : (
              <DataGrid empty={empty} rows={invoiceRows} columns={columns} />
            )}
          </div>
        );
      })()}
    </div>
  );
}
