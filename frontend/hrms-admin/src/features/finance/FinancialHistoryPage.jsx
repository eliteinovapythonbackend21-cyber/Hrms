import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Badge from "@/components/ui/Badge";
import TableToolbar from "@/components/table/TableToolbar";
import { crmApi } from "@/api/crm.api";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate, formatDateTime } from "@/utils/formatDate";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_BADGE_CLASS = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  Unpaid: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  Overdue: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

const TYPE_BADGE_CLASS = {
  Invoice: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  Payment: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
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
   PAGE
========================================================= */

export default function FinancialHistoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const invoicesQuery = useQuery({
    queryKey: ["finance-history-invoices"],
    queryFn: async () => (await crmApi.invoices.list({ per_page: 1000 })).data.data,
  });

  const paymentsQuery = useQuery({
    queryKey: ["finance-history-payments"],
    queryFn: async () => (await crmApi.payments.list({ per_page: 1000 })).data.data,
  });

  const isLoading = invoicesQuery.isLoading || paymentsQuery.isLoading;
  const isFetching = invoicesQuery.isFetching || paymentsQuery.isFetching;

  const refetchAll = () => {
    invoicesQuery.refetch();
    paymentsQuery.refetch();
  };

  const invoices = invoicesQuery.data?.items || [];
  const payments = paymentsQuery.data?.items || [];

  /* -------------------------------------------------------
     UNIFIED LEDGER — every Invoice + every Payment, one row
     each, so Finance can trace amount -> invoice -> payment
     in a single screen (a Payment already carries a summary
     of its parent invoice).
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

    return [...invoiceRows, ...paymentRows].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [invoices, payments]);

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
    return { totalInvoiced, totalPaid, outstanding };
  }, [invoices, payments]);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial History
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Every invoice and payment, in one traceable ledger
          </p>
        </div>

        <TableToolbar onRefresh={refetchAll} refreshing={isFetching} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
    </div>
  );
}
