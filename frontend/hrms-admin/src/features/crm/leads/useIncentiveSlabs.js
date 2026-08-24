import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove, useCrudGet } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.incentiveSlabs;

export const useIncentiveSlabs = (params) => useCrudList("incentive-slabs", api, params);
export const useIncentiveSlab = (id) => useCrudGet("incentive-slabs", api, id);
export const useCreateIncentiveSlab = () => useCrudCreate("incentive-slabs", api);
export const useDeactivateIncentiveSlab = () => useCrudRemove("incentive-slabs", api);

export function useUpdateIncentiveSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incentive-slabs"] }),
  });
}

export function useReactivateIncentiveSlab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.update(id, { is_active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incentive-slabs"] }),
  });
}