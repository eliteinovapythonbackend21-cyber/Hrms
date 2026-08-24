import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove, useCrudGet } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.departmentHeadcounts;

export const useDepartmentHeadcounts = (params) =>
  useCrudList("department-headcounts", api, params);

export const useDepartmentHeadcount = (id) =>
  useCrudGet("department-headcounts", api, id);

export const useCreateDepartmentHeadcount = () =>
  useCrudCreate("department-headcounts", api);

export const useDeactivateDepartmentHeadcount = () =>
  useCrudRemove("department-headcounts", api);

export function useUpdateDepartmentHeadcount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-headcounts"] });
    },
  });
}

export function useReactivateDepartmentHeadcount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.update(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-headcounts"] });
    },
  });
}