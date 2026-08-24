import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudRemove, useCrudGet } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.employeeIncentives;

export const useEmployeeIncentives = (params) => useCrudList("employee-incentives", api, params);
export const useEmployeeIncentive = (id) => useCrudGet("employee-incentives", api, id);
export const useDeactivateEmployeeIncentive = () => useCrudRemove("employee-incentives", api);

export function useUpdateEmployeeIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-incentives"] }),
  });
}

export function useCalculateEmployeeIncentives() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }) => api.calculate(month, year),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-incentives"] }),
  });
}