import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/api/users.api";

export function useUsers(params) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const res = await usersApi.list(params);
      return res.data.data;
    },
  });
}

export function useUser(id) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await usersApi.get(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => usersApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => usersApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
