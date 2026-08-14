import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/api/master.api";

export function useLeaveTypes(params) {
  return useQuery({
    queryKey: ["leave-types", params],
    queryFn: async () => {
      const res = await masterApi.listLeaveTypes(params);
      return res.data.data;
    },
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => masterApi.createLeaveType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => masterApi.updateLeaveType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
  });
}

export function useDeactivateLeaveType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => masterApi.deactivateLeaveType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
    },
  });
}
