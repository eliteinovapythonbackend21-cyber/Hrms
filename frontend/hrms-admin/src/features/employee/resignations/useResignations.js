import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.resignations;
export const useResignations = (params) => useCrudList("resignations", api, params);
export const useCreateResignation = () => useCrudCreate("resignations", api);
export const useDeactivateResignation = () => useCrudRemove("resignations", api);
