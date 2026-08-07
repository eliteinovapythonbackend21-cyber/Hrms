import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.leads;
export const useLeads = (params) => useCrudList("leads", api, params);
export const useCreateLead = () => useCrudCreate("leads", api);
export const useDeactivateLead = () => useCrudRemove("leads", api);

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.convert(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
