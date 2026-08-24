import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.leads;
export const useLeads = (params) => useCrudList("leads", api, params);
export const useCreateLead = () => useCrudCreate("leads", api);
export const useDeactivateLead = () => useCrudRemove("leads", api);

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// Reactivate goes through the same PUT /leads/<id> route as edit - the
// generic CRUD update handler only sets fields present in the request
// body, so a partial { is_active: true } payload is enough (no need to
// resend the full lead record).
export function useReactivateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.update(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.convert(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}


export function useAssignLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedTo }) => api.assign(id, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useChangeLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useLeadAssignmentHistory(id) {
  return useQuery({
    queryKey: ["leads", id, "assignment-history"],
    queryFn: () => api.getAssignmentHistory(id).then((res) => res.data.data),
    enabled: !!id,
  });
}

export function useLeadStatusHistory(id) {
  return useQuery({
    queryKey: ["leads", id, "status-history"],
    queryFn: () => api.getStatusHistory(id).then((res) => res.data.data),
    enabled: !!id,
  });
}