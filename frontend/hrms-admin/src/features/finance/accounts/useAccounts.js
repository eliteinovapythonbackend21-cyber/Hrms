import { financeApi } from "@/api/finance.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";

const api = financeApi.accounts;
export const useAccounts = (params) => useCrudList("accounts", api, params);
export const useCreateAccount = () => useCrudCreate("accounts", api);
export const useUpdateAccount = () => useCrudUpdate("accounts", api);
export const useDeactivateAccount = () => useCrudRemove("accounts", api);
