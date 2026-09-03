import { useMemo, useState } from "react";

import TableToolbar from "@/components/table/TableToolbar";
import { useTableExport } from "@/hooks/useTableExport";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { getUser } from "@/utils/tokenHelpers";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";

import {
  useRunIncentives,
  useRunPayoutNow,
  useWeeklyIncentives,
  useMonthlyPayouts,
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

// Flat monthly rule — no tiers: ₹1,000 covers the first 30 registrations,
// then +0.6% of ₹1,000 (₹6) for every registration from the 31st onward.
const INCENTIVE_TARGET_COUNT = 30;

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
  const user = getUser();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const { isCrmEmployee } = useIsCrmEmployee();
  const canManage = isAdmin;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState("weekly");
  const [viewMode, setViewMode] = useState("table");

  const { data: summary } = useIncentiveSummary(
    { year },
    { enabled: isCrmEmployee }
  );

  const weekly = useWeeklyIncentives({ year, month, per_page: 500 });
  const monthly = useMonthlyPayouts({ year, per_page: 500 });
  const yearly = useYearlyPayouts({ year, per_page: 500 });
  const invoices = useIncentiveInvoiceList({ per_page: 500 });

  const runMut = useRunIncentives();
  const runPayoutMut = useRunPayoutNow();
  const genMut = useGenerateIncentiveInvoice();

  const weeklyRows = weekly.data?.items || [];
  const monthlyRows = monthly.data?.items || [];
  const yearlyRows = yearly.data?.items || [];
  const invoiceRows = invoices.data?.items || [];

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

  const empName = (r) =>
    r.employee
      ? `${r.employee.first_name || ""} ${r.employee.last_name || ""}`.trim() ||
        r.employee.employee_code
      : `#${r.employee_id}`;

  const TABS = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
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
      { header: "Eligible", accessor: (r) => r.eligible_count },
    ],
    monthly: [
      { header: "Employee", accessor: empName },
      { header: "Period", accessor: (r) => `${MONTHS[r.month - 1]} ${r.year}` },
      { header: "Weeks", accessor: (r) => r.week_count },
      { header: "Registrations", accessor: (r) => r.registration_count },
      { header: "Eligible", accessor: (r) => r.eligible_count },
      { header: "Payout", accessor: (r) => r.amount },
      { header: "Status", accessor: (r) => r.status },
    ],
    yearly: [
      { header: "Employee", accessor: empName },
      { header: "Year", accessor: (r) => r.year },
      { header: "Months", accessor: (r) => r.month_count },
      { header: "Registrations", accessor: (r) => r.registration_count },
      { header: "Eligible", accessor: (r) => r.eligible_count },
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
    monthly: monthlyRows,
    yearly: yearlyRows,
    invoices: invoiceRows,
  };

  const { exporting, exportToExcel, exportToPDF } = useTableExport();

  // Current month's registration progress toward the 30-registration flat
  // incentive, for the CRM employee's own "My Incentive" summary.
  const currentMonthRow = (summary?.monthly || []).find(
    (m) => m.month === month && m.year === year
  );
  const currentMonthCount = currentMonthRow?.registration_count ?? 0;

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CRM Incentives
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Flat monthly incentive — ₹1,000 for the first 30 registrations,
            plus 0.6% of ₹1,000 (₹6) per registration after 30
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                / {INCENTIVE_TARGET_COUNT}+
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-primary-500"
                style={{
                  width: `${Math.min(
                    100,
                    (currentMonthCount / INCENTIVE_TARGET_COUNT) * 100
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
          { key: "eligible_count", label: "Eligible", align: "right" },
        ];
        const empty = `No weekly incentive rows for ${MONTHS[month - 1]} ${year}. ${
          canManage ? "Run the calculation above." : ""
        }`;
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={weeklyRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={weeklyRows} columns={columns} />
        );
      })()}

      {tab === "monthly" && (() => {
        const columns = [
          { key: "emp", label: "Employee", render: empName },
          {
            key: "period",
            label: "Period",
            render: (r) => `${MONTHS[r.month - 1]} ${r.year}`,
          },
          { key: "week_count", label: "Weeks", align: "right" },
          { key: "registration_count", label: "Regs", align: "right" },
          { key: "eligible_count", label: "Eligible", align: "right" },
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
        const empty = `No monthly payouts for ${year}.`;
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={monthlyRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={monthlyRows} columns={columns} />
        );
      })()}

      {tab === "yearly" && (() => {
        const columns = [
          { key: "emp", label: "Employee", render: empName },
          { key: "year", label: "Year", align: "right" },
          { key: "month_count", label: "Months", align: "right" },
          { key: "registration_count", label: "Regs", align: "right" },
          { key: "eligible_count", label: "Eligible", align: "right" },
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
        return viewMode === "card" ? (
          <CardGrid empty={empty} rows={invoiceRows} columns={columns} />
        ) : (
          <DataGrid empty={empty} rows={invoiceRows} columns={columns} />
        );
      })()}
    </div>
  );
}
