import { financeApi } from "@/api/finance.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";

const api = financeApi.vendors;
export const useVendors = (params) => useCrudList("vendors", api, params);
export const useCreateVendor = () => useCrudCreate("vendors", api);
export const useUpdateVendor = () => useCrudUpdate("vendors", api);
export const useDeactivateVendor = () => useCrudRemove("vendors", api);
