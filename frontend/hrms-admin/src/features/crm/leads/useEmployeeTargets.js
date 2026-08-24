import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove, useCrudGet } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.employeeTargets;

export const useEmployeeTargets = (params) => useCrudList("employee-targets", api, params);
export const useEmployeeTarget = (id) => useCrudGet("employee-targets", api, id);
export const useCreateEmployeeTarget = () => useCrudCreate("employee-targets", api);
export const useDeactivateEmployeeTarget = () => useCrudRemove("employee-targets", api);

export function useUpdateEmployeeTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-targets"] }),
  });
}

export function useReactivateEmployeeTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.update(id, { is_active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-targets"] }),
  });
}