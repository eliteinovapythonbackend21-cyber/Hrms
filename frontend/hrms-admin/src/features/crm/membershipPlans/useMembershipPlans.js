import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmApi } from "@/api/crm.api";

const KEY = ["membership-plans"];

export function useMembershipPlans(params) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: async () => {
      const res = await crmApi.membershipPlans.list(params);
      return res.data.data;
    },
  });
}

export function useCreateMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => crmApi.membershipPlans.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => crmApi.membershipPlans.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeactivateMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => crmApi.membershipPlans.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReactivateMembershipPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => crmApi.membershipPlans.reactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
