import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { leavesApi } from "@/api/leaves.api";

export function useLeaves(params = {}, options = {}) {
  return useQuery({
    queryKey: ["leaves", params],

    queryFn: async () => {
      const response = await leavesApi.list(params);
      return response.data.data;
    },

    enabled: options.enabled ?? true,

    placeholderData: (previousData) => previousData,

    staleTime: 30 * 1000,
  });
}

export function useMonthlyLeaveRecord(params = {}, options = {}) {
  return useQuery({
    queryKey: ["leave-monthly-record", params],

    queryFn: async () => {
      const response = await leavesApi.monthlySummary(params);
      return response.data.data;
    },

    enabled: options.enabled ?? true,

    placeholderData: (previousData) => previousData,

    staleTime: 30 * 1000,
  });
}

export function useLeave(id) {
  return useQuery({
    queryKey: ["leave", id],

    queryFn: async () => {
      const response = await leavesApi.get(id);
      return response.data.data;
    },

    enabled: Boolean(id),

    staleTime: 30 * 1000,
  });
}

function invalidateLeaveQueries(queryClient, id) {
  queryClient.invalidateQueries({
    queryKey: ["leaves"],
  });

  queryClient.invalidateQueries({
    queryKey: ["leave", id],
  });

  queryClient.invalidateQueries({
    queryKey: ["leave-approvals"],
  });

  queryClient.invalidateQueries({
    queryKey: ["leave-summary"],
  });
}

export function useCreateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => leavesApi.create(payload),

    onSuccess: () => {
      invalidateLeaveQueries(queryClient);
    },
  });
}

export function useUpdateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      leavesApi.update(id, payload),

    onSuccess: (_, variables) => {
      invalidateLeaveQueries(
        queryClient,
        variables?.id
      );
    },
  });
}

export function useDeactivateLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => leavesApi.deactivate(id),

    onSuccess: (_, id) => {
      invalidateLeaveQueries(queryClient, id);
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => leavesApi.approve(id),

    onSuccess: (_, id) => {
      invalidateLeaveQueries(queryClient, id);
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => leavesApi.reject(id),

    onSuccess: (_, id) => {
      invalidateLeaveQueries(queryClient, id);
    },
  });
}