import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.transfers;
export const useTransfers = (params) => useCrudList("transfers", api, params);
export const useCreateTransfer = () => useCrudCreate("transfers", api);
export const useDeactivateTransfer = () => useCrudRemove("transfers", api);
