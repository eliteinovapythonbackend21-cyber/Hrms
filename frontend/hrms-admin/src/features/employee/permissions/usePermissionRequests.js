import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.permissions;
export const usePermissionRequests = (params) => useCrudList("employee-permissions", api, params);
export const useCreatePermissionRequest = () => useCrudCreate("employee-permissions", api);
export const useDeactivatePermissionRequest = () => useCrudRemove("employee-permissions", api);
