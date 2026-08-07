import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation } from "@tanstack/react-query";
import { useFileDownload } from "@/hooks/useFileDownload";

const api = crmApi.invoices;
export const useInvoices = (params) => useCrudList("invoices", api, params);
export const useCreateInvoice = () => useCrudCreate("invoices", api);
export const useDeactivateInvoice = () => useCrudRemove("invoices", api);

export function useInvoiceReport() {
  const { downloadBlob } = useFileDownload();
  return useMutation({
    mutationFn: async (params) => {
      const res = await api.report(params);
      downloadBlob(res, "crm_report.xlsx");
      return res;
    },
  });
}
