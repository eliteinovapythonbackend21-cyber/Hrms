import { useQuery } from "@tanstack/react-query";
import { financeApi } from "@/api/finance.api";
import { formatCurrency } from "@/utils/formatCurrency";

// Real MTD-expenses tile (Phase 4) — the plan's "Finance — MTD expenses"
// placeholder didn't exist yet in DashboardPage, so this is added fresh
// here rather than replacing an existing stub.
export default function FinanceMtdCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", "mtd"],
    queryFn: async () => (await financeApi.expenses.list({ page: 1, per_page: 1000 })).data.data,
  });

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mtdTotal = (data?.items || [])
    .filter((e) => (e.expense_date || "").startsWith(monthPrefix))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="card group relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
            Finance — MTD Expenses
          </p>
          <p className="mt-1 text-[28px] font-bold leading-none tabular-nums text-slate-900 dark:text-white">
            {isLoading ? "…" : formatCurrency(mtdTotal)}
          </p>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
            Month to date
          </p>
        </div>
      </div>
    </div>
  );
}
