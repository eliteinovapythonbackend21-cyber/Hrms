import { useMemo, useState } from "react";

import TableToolbar from "@/components/table/TableToolbar";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/feedback/Toast";
import { getUser } from "@/utils/tokenHelpers";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDate } from "@/utils/formatDate";
import { useIsCrmEmployee } from "@/hooks/useIsCrmEmployee";

import {
  useIncentiveTiers,
  useUpdateTier,
  useCreateTier,
  useDeactivateTier,
  useRunIncentives,
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

const TIER_CHIP = {
  Bronze:
    "bg-orange-50 text-orange-700 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/25",
  Silver:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-white/10 dark:text-slate-200 dark:ring-white/15",
  Gold:
    "bg-amber-50 text-amber-700 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
};

function TierBadge({ name }) {
  if (!name)
    return (
      <span className="chip bg-slate-100 text-slate-500 ring-slate-500/15 dark:bg-white/10 dark:text-slate-400 dark:ring-white/10">
        No tier
      </span>
    );
  return (
    <span
      className={`chip ${
        TIER_CHIP[name] ||
        "bg-primary-50 text-primary-700 ring-primary-500/20 dark:bg-primary-500/10 dark:text-primary-300"
      }`}
    >
      {name === "Gold" ? "🥇" : name === "Silver" ? "🥈" : name === "Bronze" ? "🥉" : "•"}{" "}
      {name}
    </span>
  );
}

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
   TIER EDITOR (admin)
========================================================= */

function TierEditor({ tiers, readOnly }) {
  const { showToast } = useToast();
  const updateTier = useUpdateTier();
  const createTier = useCreateTier();
  const deactivateTier = useDeactivateTier();
  const [draft, setDraft] = useState({});
  const [newTier, setNewTier] = useState({
    name: "",
    min_registrations: "",
    rate_per_registration: "",
  });

  const rows = tiers || [];

  const setField = (id, key, val) =>
    setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: val } }));

  const save = async (tier) => {
    const patch = draft[tier.id] || {};
    if (!Object.keys(patch).length) return;
    try {
      await updateTier.mutateAsync({
        id: tier.id,
        payload: {
          min_registrations:
            patch.min_registrations != null
              ? Number(patch.min_registrations)
              : tier.min_registrations,
          rate_per_registration:
            patch.rate_per_registration != null
              ? Number(patch.rate_per_registration)
              : tier.rate_per_registration,
        },
      });
      setDraft((d) => {
        const next = { ...d };
        delete next[tier.id];
        return next;
      });
      showToast("Tier updated", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Update failed", "error");
    }
  };

  const add = async () => {
    if (!newTier.name.trim())
      return showToast("Tier name is required", "error");
    try {
      await createTier.mutateAsync({
        name: newTier.name.trim(),
        min_registrations: Number(newTier.min_registrations || 0),
        rate_per_registration: Number(newTier.rate_per_registration || 0),
        sort_order: rows.length + 1,
      });
      setNewTier({ name: "", min_registrations: "", rate_per_registration: "" });
      showToast("Tier added", "success");
    } catch (e) {
      showToast(e?.response?.data?.message || "Create failed", "error");
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200/70 px-5 py-3 dark:border-white/10">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Incentive tiers
        </h3>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          A CRM employee sits in the highest tier their weekly registrations
          reach — shown as a badge only. The <b>payable monthly incentive</b>{" "}
          is flat: ₹1,000 for the first 30 registrations added via the
          Registration page in a month, plus an extra 0.6% of ₹1,000 (₹6) for
          every registration from the 31st onward.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="tbl-head">
            <tr>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Min. weekly registrations</th>
              <th className="px-4 py-3">Rate / registration</th>
              {!readOnly && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {rows.map((tier) => {
              const d = draft[tier.id] || {};
              const dirty = Object.keys(d).length > 0;
              return (
                <tr key={tier.id} className="tbl-row">
                  <td className="px-4 py-3">
                    <TierBadge name={tier.name} />
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      tier.min_registrations
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={
                          d.min_registrations ?? tier.min_registrations ?? 0
                        }
                        onChange={(e) =>
                          setField(tier.id, "min_registrations", e.target.value)
                        }
                        className="h-9 w-28 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      formatCurrency(tier.rate_per_registration)
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={
                          d.rate_per_registration ??
                          tier.rate_per_registration ??
                          0
                        }
                        onChange={(e) =>
                          setField(
                            tier.id,
                            "rate_per_registration",
                            e.target.value
                          )
                        }
                        className="h-9 w-32 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={!dirty || updateTier.isPending}
                          onClick={() => save(tier)}
                          className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-primary-500/15 transition hover:bg-primary-100 disabled:opacity-40 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={deactivateTier.isPending}
                          onClick={() => deactivateTier.mutate(tier.id)}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {!readOnly && (
              <tr className="tbl-row">
                <td className="px-4 py-3">
                  <input
                    placeholder="Tier name"
                    value={newTier.name}
                    onChange={(e) =>
                      setNewTier((t) => ({ ...t, name: e.target.value }))
                    }
                    className="h-9 w-32 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newTier.min_registrations}
                    onChange={(e) =>
                      setNewTier((t) => ({
                        ...t,
                        min_registrations: e.target.value,
                      }))
                    }
                    className="h-9 w-28 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newTier.rate_per_registration}
                    onChange={(e) =>
                      setNewTier((t) => ({
                        ...t,
                        rate_per_registration: e.target.value,
                      }))
                    }
                    className="h-9 w-32 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={createTier.isPending}
                    onClick={add}
                    className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-500/15 transition hover:bg-emerald-100 disabled:opacity-40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                  >
                    + Add tier
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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

  const { data: tiers } = useIncentiveTiers();
  const { data: summary } = useIncentiveSummary(
    { year },
    { enabled: isCrmEmployee }
  );

  const weekly = useWeeklyIncentives({ year, month, per_page: 500 });
  const monthly = useMonthlyPayouts({ year, per_page: 500 });
  const yearly = useYearlyPayouts({ year, per_page: 500 });
  const invoices = useIncentiveInvoiceList({ per_page: 500 });

  const runMut = useRunIncentives();
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
    { id: "tiers", label: "Tiers" },
  ];

  return (
    <div className="min-w-0 space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            CRM Incentives
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Bronze / Silver / Gold tier payouts — weekly, monthly and yearly
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
          />

          {canManage && (
            <Button
              type="button"
              onClick={runNow}
              isLoading={runMut.isPending}
              className="h-10 px-4"
            >
              Run for {MONTHS[month - 1]} {year}
            </Button>
          )}
        </div>
      </div>

      {/* CRM EMPLOYEE — MY TIER */}
      {isCrmEmployee && summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="stat-tile stat-tile-primary p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Current tier
            </p>
            <div className="mt-2">
              <TierBadge name={summary.current_tier} />
            </div>
          </div>
          <div className="stat-tile stat-tile-success p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              This year's payout
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.yearly?.amount || 0)}
            </p>
          </div>
          <div className="stat-tile stat-tile-info p-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registrations ({year})
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.yearly?.registration_count ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* TABS */}
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

      {tab === "weekly" && (
        <DataGrid
          empty={`No weekly incentive rows for ${MONTHS[month - 1]} ${year}. ${
            canManage ? "Run the calculation above." : ""
          }`}
          rows={weeklyRows}
          columns={[
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
            {
              key: "tier_name",
              label: "Tier",
              render: (r) => <TierBadge name={r.tier_name} />,
            },
            {
              key: "rate_per_registration",
              label: "Rate",
              align: "right",
              render: (r) => formatCurrency(r.rate_per_registration),
            },
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
          ]}
        />
      )}

      {tab === "monthly" && (
        <DataGrid
          empty={`No monthly payouts for ${year}.`}
          rows={monthlyRows}
          columns={[
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
          ]}
        />
      )}

      {tab === "yearly" && (
        <DataGrid
          empty={`No yearly payouts for ${year}.`}
          rows={yearlyRows}
          columns={[
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
          ]}
        />
      )}

      {tab === "invoices" && (
        <DataGrid
          empty="No incentive invoices yet."
          rows={invoiceRows}
          columns={[
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
          ]}
        />
      )}

      {tab === "tiers" && (
        <TierEditor tiers={tiers} readOnly={!canManage} />
      )}
    </div>
  );
}
