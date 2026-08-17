import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudUpdate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.promotions;
export const usePromotions = (params) => useCrudList("promotions", api, params);
export const useCreatePromotion = () => useCrudCreate("promotions", api);
// NOTE: same assumption as useUpdateDocument — useCrudUpdate must exist in
// useCrudResource.js. Promotions have no file upload, so (unlike
// documents) the generic JSON update() from createCrudApi is fine as-is —
// no multipart override needed in employee.api.js for this one.
export const useUpdatePromotion = () => useCrudUpdate("promotions", api);
export const useDeactivatePromotion = () => useCrudRemove("promotions", api);