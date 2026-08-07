import { financeApi } from "@/api/finance.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = financeApi.income;
export const useIncome = (params) => useCrudList("income", api, params);
export const useCreateIncome = () => useCrudCreate("income", api);
export const useDeactivateIncome = () => useCrudRemove("income", api);
