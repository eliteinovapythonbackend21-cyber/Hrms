import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudUpdate,
  useCrudRemove,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";


const api = employeeLifecycleApi.training;


/* ============================================================
   TRAINING LIST
============================================================ */

export const useTrainingPrograms = (params) =>
  useCrudList("training", api, params);


/* ============================================================
   CREATE TRAINING
============================================================ */

export const useCreateTrainingProgram = () =>
  useCrudCreate("training", api);


/* ============================================================
   UPDATE TRAINING
============================================================ */

export const useUpdateTrainingProgram = () =>
  useCrudUpdate("training", api);


/* ============================================================
   DEACTIVATE TRAINING
============================================================ */

export const useDeactivateTrainingProgram = () =>
  useCrudRemove("training", api);


/* ============================================================
   REACTIVATE TRAINING
   Reuses the existing PUT route via api.reactivate. Follows the
   same pattern as reactivate hooks elsewhere in the app (e.g.
   Holiday, CRM modules) — a plain mutation that invalidates the
   "training" list query on success so the record moves back
   into the Active tab.
============================================================ */

export function useReactivateTrainingProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => api.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training"] });
    },
  });
}