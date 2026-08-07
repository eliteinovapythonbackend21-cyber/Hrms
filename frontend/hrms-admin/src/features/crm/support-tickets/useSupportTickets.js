import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = crmApi.supportTickets;
export const useSupportTickets = (params) => useCrudList("support-tickets", api, params);
export const useCreateSupportTicket = () => useCrudCreate("support-tickets", api);
export const useDeactivateSupportTicket = () => useCrudRemove("support-tickets", api);
