import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leavesApi } from "@/api/leaves.api";

export function useLeaves(params) {
  return useQuery({
    queryKey: ["leaves", params],
    queryFn: async () => {
      const res = await leavesApi.list(params);
      return res.data.data;
    },
  });
}

export function useLeave(id) {
  return useQuery({
    queryKey: ["leave", id],
    queryFn: async () => {
      const res = await leavesApi.get(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => leavesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useUpdateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => leavesApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useDeactivateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => leavesApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => leavesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => leavesApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
    },
  });
}
