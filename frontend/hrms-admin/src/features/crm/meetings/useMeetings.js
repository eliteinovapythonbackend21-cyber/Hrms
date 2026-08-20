import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const api = crmApi.meetings;

/* =========================================================
   LIST
========================================================= */

export const useMeetings = (
  params
) =>
  useCrudList(
    "meetings",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useMeeting = (
  id
) =>
  useCrudGet(
    "meetings",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateMeeting =
  () =>
    useCrudCreate(
      "meetings",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
   NOTE: hits the generic DELETE /meetings/:id route, which is
   intentionally blocked (deletable=False on meetings_bp) - kept
   here only for parity with the sibling files. Actual deactivation
   goes through PUT with { is_active: false }, same as leads,
   customers, and follow-ups.
========================================================= */

export const useDeactivateMeeting =
  () =>
    useCrudRemove(
      "meetings",
      api
    );

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateMeeting() {
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
            "meetings",
          ],
        }
      );
    },
  });
}

/* =========================================================
   REACTIVATE
   Goes through the same PUT /meetings/:id route as edit - the
   generic CRUD update handler only sets fields present in the
   request body, so a partial { is_active: true } payload is enough.
========================================================= */

export function useReactivateMeeting() {
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
            "meetings",
          ],
        }
      );
    },
  });
}