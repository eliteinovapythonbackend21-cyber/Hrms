import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi } from "@/api/roles.api";

export function useRoles(params) {
  return useQuery({
    queryKey: ["roles", params],
    queryFn: async () => {
      const res = await rolesApi.list(params);
      return res.data.data;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => rolesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => rolesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useDeactivateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => rolesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
