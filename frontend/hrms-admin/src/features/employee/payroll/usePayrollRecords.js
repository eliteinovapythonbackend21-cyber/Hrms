import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation } from "@tanstack/react-query";
import { useFileDownload } from "@/hooks/useFileDownload";

const api = employeeLifecycleApi.payroll;
export const usePayrollRecords = (params) => useCrudList("payroll", api, params);
export const useCreatePayrollRecord = () => useCrudCreate("payroll", api);
export const useDeactivatePayrollRecord = () => useCrudRemove("payroll", api);

export function usePayrollReport() {
  const { downloadBlob } = useFileDownload();
  return useMutation({
    mutationFn: async (params) => {
      const res = await api.report ? api.report(params) : null;
      if (res) downloadBlob(res, "payroll_report.xlsx");
      return res;
    },
  });
}
