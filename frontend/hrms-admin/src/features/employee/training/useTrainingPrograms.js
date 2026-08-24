import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
} from "@/hooks/useCrudResource";

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
   DEACTIVATE TRAINING
============================================================ */

export const useDeactivateTrainingProgram = () =>
  useCrudRemove("training", api);