import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.overtime;
export const useOvertime = (params) => useCrudList("overtime", api, params);
export const useCreateOvertime = () => useCrudCreate("overtime", api);
export const useDeactivateOvertime = () => useCrudRemove("overtime", api);
