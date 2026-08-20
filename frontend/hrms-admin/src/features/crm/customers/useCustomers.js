import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove, useCrudGet } from "@/hooks/useCrudResource";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.customers;
export const useCustomers = (params) => useCrudList("customers", api, params);
export const useCustomer = (id) => useCrudGet("customers", api, id);
export const useCreateCustomer = () => useCrudCreate("customers", api);

// NOTE: useCrudRemove hits the generic DELETE /customers/:id route,
// which is intentionally blocked (deletable=False on customers_bp) -
// exactly mirroring useDeactivateLead in useLeads.js, which is
// similarly unused/non-functional since leads_bp also has
// deletable=False. Kept here only for parity with the leads file;
// actual deactivation goes through useReactivateCustomer's sibling
// pattern below (PUT with is_active), same as leads.
export const useDeactivateCustomer = () => useCrudRemove("customers", api);

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Reactivate (and deactivate, via { is_active: false }) both go
// through the same PUT /customers/:id route as edit - the generic
// CRUD update handler only sets fields present in the request body,
// so a partial { is_active: true/false } payload is enough (no need
// to resend the full customer record). Mirrors useReactivateLead.
export function useReactivateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.update(id, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}