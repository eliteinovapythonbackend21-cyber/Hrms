import { financeApi } from "@/api/finance.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation } from "@tanstack/react-query";
import { useFileDownload } from "@/hooks/useFileDownload";

const api = financeApi.expenses;
export const useExpenses = (params) => useCrudList("expenses", api, params);
export const useCreateExpense = () => useCrudCreate("expenses", api);
export const useDeactivateExpense = () => useCrudRemove("expenses", api);

export function useExpenseReport() {
  const { downloadBlob } = useFileDownload();
  return useMutation({
    mutationFn: async (params) => {
      const res = await api.report(params);
      downloadBlob(res, "finance_report.xlsx");
      return res;
    },
  });
}
