import { employeeLifecycleApi } from "@/api/employee.api";
import { useCrudList, useCrudCreate, useCrudRemove } from "@/hooks/useCrudResource";

const api = employeeLifecycleApi.training;
export const useTrainingPrograms = (params) => useCrudList("training", api, params);
export const useCreateTrainingProgram = () => useCrudCreate("training", api);
export const useDeactivateTrainingProgram = () => useCrudRemove("training", api);
