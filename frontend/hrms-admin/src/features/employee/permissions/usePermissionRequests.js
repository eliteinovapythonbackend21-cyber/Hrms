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
  employeeLifecycleApi.permissions;


/* ============================================================
   LIST
============================================================ */

export const usePermissionRequests = (
  params
) =>
  useCrudList(
    "employee-permissions",
    api,
    params
  );


/* ============================================================
   CREATE
============================================================ */

export const useCreatePermissionRequest =
  () =>
    useCrudCreate(
      "employee-permissions",
      api
    );


/* ============================================================
   UPDATE
============================================================ */

export const useUpdatePermissionRequest =
  () =>
    useCrudUpdate(
      "employee-permissions",
      api
    );


/* ============================================================
   DEACTIVATE
============================================================ */

export const useDeactivatePermissionRequest =
  () =>
    useCrudRemove(
      "employee-permissions",
      api
    );


/* ============================================================
   REACTIVATE
============================================================ */

export function useReactivatePermissionRequest() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      api.reactivate(id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "employee-permissions",
        ],
      });
    },
  });
}