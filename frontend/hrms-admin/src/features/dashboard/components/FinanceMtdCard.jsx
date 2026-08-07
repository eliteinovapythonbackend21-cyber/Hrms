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
    <div className="card p-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">Finance — MTD Expenses</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
        {isLoading ? "…" : formatCurrency(mtdTotal)}
      </p>
    </div>
  );
}
