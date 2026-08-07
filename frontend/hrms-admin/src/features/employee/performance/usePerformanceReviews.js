import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.performance;
export const usePerformanceReviews = (params) => useCrudList("performance", api, params);
export const useCreatePerformanceReview = () => useCrudCreate("performance", api);
export const useDeactivatePerformanceReview = () => useCrudRemove("performance", api);
