import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const api =
  crmApi.followUps;

/* =========================================================
   LIST
========================================================= */

export const useFollowUps = (
  params
) =>
  useCrudList(
    "follow-ups",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useFollowUp = (
  id
) =>
  useCrudGet(
    "follow-ups",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateFollowUp =
  () =>
    useCrudCreate(
      "follow-ups",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
   NOTE: hits the generic DELETE /follow-ups/:id route, which is
   intentionally blocked (deletable=False on follow_ups_bp) - kept
   here only for parity with useDeactivateLead / useDeactivateCustomer
   in the sibling files. Actual deactivation goes through PUT with
   { is_active: false }, same as leads and customers.
========================================================= */

export const useDeactivateFollowUp =
  () =>
    useCrudRemove(
      "follow-ups",
      api
    );

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateFollowUp() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }) =>
      api.update(
        id,
        payload
      ),

    onSuccess: () => {
      queryClient.invalidateQueries(
        {
          queryKey: [
            "follow-ups",
          ],
        }
      );
    },
  });
}

/* =========================================================
   REACTIVATE
   Goes through the same PUT /follow-ups/:id route as edit - the
   generic CRUD update handler only sets fields present in the
   request body, so a partial { is_active: true } payload is enough.
   Mirrors useReactivateLead / useReactivateCustomer.
========================================================= */

export function useReactivateFollowUp() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn: (id) =>
      api.update(id, {
        is_active: true,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries(
        {
          queryKey: [
            "follow-ups",
          ],
        }
      );
    },
  });
}