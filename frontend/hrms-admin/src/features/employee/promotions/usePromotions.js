import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.promotions;
export const usePromotions = (params) => useCrudList("promotions", api, params);
export const useCreatePromotion = () => useCrudCreate("promotions", api);
export const useDeactivatePromotion = () => useCrudRemove("promotions", api);
