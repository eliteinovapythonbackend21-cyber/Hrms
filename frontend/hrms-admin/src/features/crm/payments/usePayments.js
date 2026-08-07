import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = crmApi.payments;
export const usePayments = (params) => useCrudList("payments", api, params);
export const useCreatePayment = () => useCrudCreate("payments", api);
export const useDeactivatePayment = () => useCrudRemove("payments", api);
