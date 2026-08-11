import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { masterApi } from "@/api/master.api";

export function useCompanies(params) {
  return useQuery({
    queryKey: ["companies", params],
    queryFn: async () => {
      const res = await masterApi.listCompanies(params);
      return res.data.data;
    },
  });
}

export function useCompany(id) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const res = await masterApi.getCompany(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) =>
      masterApi.createCompany(payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      masterApi.updateCompany(id, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });

      queryClient.invalidateQueries({
        queryKey: ["company", variables.id],
      });
    },
  });
}

export function useDeactivateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      masterApi.deactivateCompany(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });
    },
  });
}