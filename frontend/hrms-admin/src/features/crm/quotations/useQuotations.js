import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = crmApi.quotations;
export const useQuotations = (params) => useCrudList("quotations", api, params);
export const useCreateQuotation = () => useCrudCreate("quotations", api);
export const useDeactivateQuotation = () => useCrudRemove("quotations", api);
