import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.documents;
export const useDocuments = (params) => useCrudList("employee-documents", api, params);
export const useCreateDocument = () => useCrudCreate("employee-documents", api);
export const useDeactivateDocument = () => useCrudRemove("employee-documents", api);
