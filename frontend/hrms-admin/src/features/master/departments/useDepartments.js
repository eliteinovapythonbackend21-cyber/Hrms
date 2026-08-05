import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/api/master.api";

export function useDepartments(params) {
  return useQuery({
    queryKey: ["departments", params],
    queryFn: async () => {
      const res = await masterApi.listDepartments(params);
      return res.data.data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => masterApi.createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => masterApi.updateDepartment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeactivateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => masterApi.deactivateDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
