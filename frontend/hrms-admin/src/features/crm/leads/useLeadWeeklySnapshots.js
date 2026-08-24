import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudGet } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.leadWeeklySnapshots;

export const useLeadWeeklySnapshots = (params) =>
  useCrudList("lead-weekly-snapshots", api, params);

export const useLeadWeeklySnapshot = (id) =>
  useCrudGet("lead-weekly-snapshots", api, id);

export function useGenerateLeadWeeklySnapshots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (weekStartDate) => api.generate(weekStartDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-weekly-snapshots"] });
    },
  });
}