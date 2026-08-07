import { crmApi } from "@/api/crm.api";
import { useCrudList, useCrudCreate, useCrudRemove, useCrudGet } from "@/hooks/useCrudResource";

const api = crmApi.customers;
export const useCustomers = (params) => useCrudList("customers", api, params);
export const useCustomer = (id) => useCrudGet("customers", api, id);
export const useCreateCustomer = () => useCrudCreate("customers", api);
export const useDeactivateCustomer = () => useCrudRemove("customers", api);
