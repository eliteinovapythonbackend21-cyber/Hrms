import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Generic React Query wrappers shared by every feature-folder `use<Name>.js`
// hook file. `key` is the react-query cache key prefix (e.g. "holidays").
export function useCrudList(key, api, params) {
  return useQuery({
    queryKey: [key, params],
    queryFn: async () => (await api.list(params)).data.data,
  });
}

export function useCrudGet(key, api, id) {
  return useQuery({
    queryKey: [key, "item", id],
    queryFn: async () => (await api.get(id)).data.data,
    enabled: !!id,
  });
}

export function useCrudCreate(key, api) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
}

export function useCrudUpdate(key, api) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
}

export function useCrudRemove(key, api) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [key] }),
  });
}
