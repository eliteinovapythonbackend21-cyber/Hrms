import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.exitManagement;
export const useExitManagement = (params) => useCrudList("exit-management", api, params);
export const useCreateExitManagement = () => useCrudCreate("exit-management", api);
export const useDeactivateExitManagement = () => useCrudRemove("exit-management", api);
