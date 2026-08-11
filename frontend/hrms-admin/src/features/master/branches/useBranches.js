import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { masterApi } from "@/api/master.api";

export function useBranches(params) {
  return useQuery({
    queryKey: ["branches", params],
    queryFn: async () => {
      const res = await masterApi.listBranches(params);
      return res.data.data;
    },
  });
}

export function useBranch(id) {
  return useQuery({
    queryKey: ["branch", id],
    queryFn: async () => {
      const res = await masterApi.getBranch(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCompanyBranches(companyId, params) {
  return useQuery({
    queryKey: ["company-branches", companyId, params],
    queryFn: async () => {
      const res = await masterApi.listCompanyBranches(
        companyId,
        params
      );

      return res.data.data;
    },
    enabled: !!companyId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, payload }) =>
      masterApi.createBranch(companyId, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branches"],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "company-branches",
          variables.companyId,
        ],
      });

      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      masterApi.updateBranch(id, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["branches"],
      });

      queryClient.invalidateQueries({
        queryKey: ["company-branches"],
      });

      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });
    },
  });
}

export function useDeactivateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      masterApi.deactivateBranch(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["branches"],
      });

      queryClient.invalidateQueries({
        queryKey: ["company-branches"],
      });

      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });
    },
  });
}