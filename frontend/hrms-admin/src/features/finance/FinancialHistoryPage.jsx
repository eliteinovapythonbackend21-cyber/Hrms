import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/ui/Badge";
import TableToolbar from "@/components/table/TableToolbar";
import { crmApi } from "@/api/crm.api";
import { employeeLifecycleApi } from "@/api/employee.api";
import { useMonthlyAttendance } from "@/features/attendance/useMonthlyAttendance";
import { useTableExport } from "@/hooks/useTableExport";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/utils/formatDate";

/* =========================================================
   EXPORT COLUMNS
========================================================= */

const LEDGER_EXPORT_COLUMNS = [
  { header: "Date", accessor: (r) => (r.date ? new Date(r.date).toLocaleString() : "-") },
  { header: "Type", accessor: (r) => r.type },
  { header: "Reference", accessor: (r) => r.reference },
  { header: "Party / Mode", accessor: (r) => r.party },
  { header: "Category", accessor: (r) => r.category },
  { header: "Amount", accessor: (r) => r.amount },
  { header: "Status", accessor: (r) => r.status },
];

const ATTENDANCE_EXPORT_COLUMNS = [
  { header: "Employee", accessor: (r) => r.employee_name },
  { header: "Code", accessor: (r) => r.employee_code },
  {
    header: "Total Deduction",
    accessor: (r) =>
      r.total_deduction != null
        ? Number(r.total_deduction)
        : Number(r.leave_deduction || 0) + Number(r.absent_deduction || 0),
  },
  { header: "Incentive", accessor: (r) => (r.incentive_amount != null ? Number(r.incentive_amount) : "") },
  { header: "Net Salary", accessor: (r) => Number(r.net_salary || 0) },
];

/* =========================================================
   CONSTANTS
========================================================= */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_BADGE_CLASS = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Unpaid: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Overdue: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

const TYPE_BADGE_CLASS = {
  Invoice: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Payment: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Payroll: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
};

function partyName(row) {
  if (row.employee) {
    return (
      `${row.employee.first_name || ""} ${row.employee.last_name || ""}`.trim() ||
      row.employee.employee_code ||
      `Employee #${row.employee.id}`
    );
  }
  if (row.customer) {
    return row.customer.customer_name || `Customer #${row.customer.id}`;
  }
  return "—";
}

/* =========================================================
   STAT TILE
========================================================= */

function StatTile({ label, value, tone, description }) {
  const toneClass = {
    primary: "text-slate-900 dark:text-white",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[tone || "primary"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</p>
      {description && (
        <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{description}</p>
      )}
    </div>
  );
}

/* =========================================================
   ATTENDANCE & SALARY HISTORY
   Same monthly attendance/salary/incentive figures as the Finance
   Attendance screen, browsable by month right here so Finance has one
   place to check both the invoice/payment ledger and the underlying
   attendance-driven salary history that produced those incentives.
========================================================= */

function AttendanceHistorySection() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading, isFetching, refetch } = useMonthlyAttendance(month, year);
  const rows = data?.items || [];

  const { exporting, exportToExcel, exportToPDF } = useTableExport();

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          const deduction =
            r.total_deduction != null
              ? Number(r.total_deduction)
              : Number(r.leave_deduction || 0) + Number(r.absent_deduction || 0);
          acc.deduction += deduction;
          acc.incentive += Number(r.incentive_amount || 0);
          acc.netSalary += Number(r.net_salary || 0);
          return acc;
        },
        { deduction: 0, incentive: 0, netSalary: 0 }
      ),
    [rows]
  );

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y + 1, y, y - 1, y - 2];
  }, [now]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Attendance-derived salary deductions, CRM incentives, and net salary — by month.
        </p>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <TableToolbar
            onRefresh={refetch}
            refreshing={isFetching}
            exporting={exporting}
            onExportExcel={() =>
              exportToExcel(rows, ATTENDANCE_EXPORT_COLUMNS, `attendance-salary-history-${year}-${String(month).padStart(2, "0")}`)
            }
            onExportPDF={() =>
              exportToPDF(
                rows,
                ATTENDANCE_EXPORT_COLUMNS,
                `attendance-salary-history-${year}-${String(month).padStart(2, "0")}`,
                `Attendance & Salary History — ${MONTH_NAMES[month - 1]} ${year}`
              )
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile tone="red" label="Total Deductions" value={formatCurrency(totals.deduction)} description={`${MONTH_NAMES[month - 1]} ${year}`} />
        <StatTile tone="emerald" label="Total Incentives" value={formatCurrency(totals.incentive)} description="CRM registration incentives" />
        <StatTile label="Total Net Salary" value={formatCurrency(totals.netSalary)} description={`${rows.length} employee${rows.length === 1 ? "" : "s"}`} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="tbl-head">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 text-right font-medium">Total Deduction</th>
                <th className="px-4 py-3 text-right font-medium">Incentive</th>
                <th className="px-4 py-3 text-right font-medium">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    No attendance/salary records for {MONTH_NAMES[month - 1]} {year}.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const deduction =
                    r.total_deduction != null
                      ? Number(r.total_deduction)
                      : Number(r.leave_deduction || 0) + Number(r.absent_deduction || 0);
                  return (
                    <tr key={r.employee_id} className="tbl-row">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                        {r.employee_name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {r.employee_code || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(deduction)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                        {r.incentive_amount != null ? formatCurrency(r.incentive_amount) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(r.net_salary || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function FinancialHistoryPage() {
  const [tab, setTab] = useState("ledger");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { exporting, exportToExcel, exportToPDF } = useTableExport();

  const invoicesQuery = useQuery({
    queryKey: ["finance-history-invoices"],
    queryFn: async () => (await crmApi.invoices.list({ per_page: 1000 })).data.data,
  });

  const paymentsQuery = useQuery({
    queryKey: ["finance-history-payments"],
    queryFn: async () => (await crmApi.payments.list({ per_page: 1000 })).data.data,
  });

  // Payroll — every employee's payslip run (not CRM-only, unlike the
  // Invoice/Payment side of this ledger which is CRM/customer invoicing),
  // so this ledger reflects overall employee salary too.
  const payrollQuery = useQuery({
    queryKey: ["finance-history-payroll"],
    queryFn: async () => (await employeeLifecycleApi.payroll.list({ per_page: 1000 })).data.data,
  });

  const isLoading = invoicesQuery.isLoading || paymentsQuery.isLoading || payrollQuery.isLoading;
  const isFetching = invoicesQuery.isFetching || paymentsQuery.isFetching || payrollQuery.isFetching;

  const refetchAll = () => {
    invoicesQuery.refetch();
    paymentsQuery.refetch();
    payrollQuery.refetch();
  };

  const invoices = invoicesQuery.data?.items || [];
  const payments = paymentsQuery.data?.items || [];
  const payroll = payrollQuery.data?.items || [];

  /* -------------------------------------------------------
     UNIFIED LEDGER — every Invoice + every Payment + every
     Payroll run, one row each, so Finance can trace amount ->
     invoice -> payment (CRM/customer side) and see overall
     employee salary payouts (all departments, not just CRM) in
     the same screen.
  ------------------------------------------------------- */
  const rows = useMemo(() => {
    const invoiceRows = invoices.map((inv) => ({
      key: `invoice-${inv.id}`,
      type: "Invoice",
      date: inv.created_at,
      reference: inv.invoice_number || `#${inv.id}`,
      party: partyName(inv),
      category: inv.invoice_type || "Customer",
      amount: Number(inv.amount || 0),
      status: inv.status || "Unpaid",
      raw: inv,
    }));

    const paymentRows = payments.map((pay) => ({
      key: `payment-${pay.id}`,
      type: "Payment",
      date: pay.payment_date || pay.created_at,
      reference: pay.invoice?.invoice_number || `Invoice #${pay.invoice_id}`,
      party: pay.mode || "—",
      category: pay.gateway ? "Gateway" : "Manual",
      amount: Number(pay.amount || 0),
      status: pay.invoice?.status || "Paid",
      raw: pay,
    }));

    const payrollRows = payroll.map((p) => ({
      key: `payroll-${p.id}`,
      type: "Payroll",
      date: p.created_at,
      reference: p.pay_month || `#${p.id}`,
      party: p.employee
        ? `${p.employee.first_name || ""} ${p.employee.last_name || ""}`.trim() ||
          p.employee.employee_code
        : `Employee #${p.employee_id}`,
      category: p.employee?.department?.department_name || "All Employees",
      amount: Number(p.net_salary || 0),
      status: p.status || "Draft",
      raw: p,
    }));

    return [...invoiceRows, ...paymentRows, ...payrollRows].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [invoices, payments, payroll]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (typeFilter && row.type !== typeFilter) return false;
      if (statusFilter && row.status !== statusFilter) return false;
      if (!keyword) return true;
      return (
        String(row.reference).toLowerCase().includes(keyword) ||
        String(row.party).toLowerCase().includes(keyword)
      );
    });
  }, [rows, search, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
    const outstanding = invoices
      .filter((inv) => inv.status !== "Paid")
      .reduce((sum, inv) => {
        const paid = Number(inv.paid_amount || 0);
        return sum + Math.max(0, Number(inv.amount || 0) - paid);
      }, 0);
    const totalPayroll = payroll.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
    return { totalInvoiced, totalPaid, outstanding, totalPayroll };
  }, [invoices, payments, payroll]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial History
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {tab === "ledger"
              ? "Every invoice, payment and employee payroll run — across all departments, not just CRM"
              : "Attendance-driven salary deductions, incentives and net salary, by month"}
          </p>
        </div>

        {tab === "ledger" && (
          <TableToolbar
            onRefresh={refetchAll}
            refreshing={isFetching}
            exporting={exporting}
            onExportExcel={() => exportToExcel(filteredRows, LEDGER_EXPORT_COLUMNS, "financial-history")}
            onExportPDF={() => exportToPDF(filteredRows, LEDGER_EXPORT_COLUMNS, "financial-history", "Financial History")}
          />
        )}
      </div>

      <div className="flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/[0.06]">
        <button
          type="button"
          onClick={() => setTab("ledger")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            tab === "ledger"
              ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          Invoice &amp; Payment Ledger
        </button>
        <button
          type="button"
          onClick={() => setTab("attendance")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
            tab === "attendance"
              ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
          }`}
        >
          Attendance &amp; Salary History
        </button>
      </div>

      {tab === "attendance" && <AttendanceHistorySection />}

      {tab === "ledger" && (
      <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total Invoiced"
          value={formatCurrency(summary.totalInvoiced)}
          description={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Total Paid"
          tone="emerald"
          value={formatCurrency(summary.totalPaid)}
          description={`${payments.length} payment${payments.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Outstanding"
          tone={summary.outstanding > 0 ? "amber" : "emerald"}
          value={formatCurrency(summary.outstanding)}
          description="Unpaid / partially paid invoices"
        />
        <StatTile
          label="Total Payroll"
          value={formatCurrency(summary.totalPayroll)}
          description={`${payroll.length} payslip${payroll.length === 1 ? "" : "s"} — all employees`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or party..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">All Types</option>
              <option value="Invoice">Invoice</option>
              <option value="Payment">Payment</option>
              <option value="Payroll">Payroll</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-white/[0.06] dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="tbl-head">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Party / Mode</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-white/[0.06]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                      No financial records found.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.key} className="tbl-row">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.type === "Invoice" ? formatDateTime(row.date) : formatDate(row.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={TYPE_BADGE_CLASS[row.type]}>{row.type}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                        {row.reference}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.party}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                        {row.category}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge className={STATUS_BADGE_CLASS[row.status] || STATUS_BADGE_CLASS.Draft}>
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Showing {filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}.
        </p>
      </div>
      </>
      )}
    </div>
  );
}
