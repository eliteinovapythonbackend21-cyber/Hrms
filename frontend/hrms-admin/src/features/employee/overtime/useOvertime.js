import { employeeLifecycleApi } from "@/api/employee.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudUpdate,
  useCrudRemove,
} from "@/hooks/useCrudResource";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";


const api =
  employeeLifecycleApi.overtime;


/* ============================================================
   LIST
============================================================ */

export const useOvertime = (
  params
) =>
  useCrudList(
    "overtime",
    api,
    params
  );


/* ============================================================
   CREATE
============================================================ */

export const useCreateOvertime = () =>
  useCrudCreate(
    "overtime",
    api
  );


/* ============================================================
   UPDATE
============================================================ */

export const useUpdateOvertime = () =>
  useCrudUpdate(
    "overtime",
    api
  );


/* ============================================================
   DEACTIVATE
============================================================ */

export const useDeactivateOvertime =
  () =>
    useCrudRemove(
      "overtime",
      api
    );


/* ============================================================
   REACTIVATE
============================================================ */

export function useReactivateOvertime() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      api.reactivate(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["overtime"],
      });
    },
  });
}