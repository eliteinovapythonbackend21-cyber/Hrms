import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { masterApi } from "@/api/master.api";

export function useDesignations(params) {
  return useQuery({
    queryKey: ["designations", params],
    queryFn: async () => {
      const res = await masterApi.listDesignations(params);
      return res.data.data;
    },
  });
}

export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => masterApi.createDesignation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => masterApi.updateDesignation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
  });
}

export function useDeactivateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => masterApi.deactivateDesignation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
    },
  });
}
