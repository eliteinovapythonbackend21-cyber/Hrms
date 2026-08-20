import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const api =
  crmApi.quotations;

/* =========================================================
   LIST
========================================================= */

export const useQuotations = (
  params
) =>
  useCrudList(
    "quotations",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useQuotation = (
  id
) =>
  useCrudGet(
    "quotations",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateQuotation =
  () =>
    useCrudCreate(
      "quotations",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
   NOTE: hits the generic DELETE /quotations/:id route, which is
   intentionally blocked (deletable=False on quotations_bp) - kept
   here only for parity with the sibling files. Actual deactivation
   goes through PUT with { is_active: false }, same as leads,
   customers, follow-ups, and meetings.
========================================================= */

export const useDeactivateQuotation =
  () =>
    useCrudRemove(
      "quotations",
      api
    );

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateQuotation() {
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
            "quotations",
          ],
        }
      );
    },
  });
}

/* =========================================================
   REACTIVATE
   Goes through the same PUT /quotations/:id route as edit - the
   generic CRUD update handler only sets fields present in the
   request body, so a partial { is_active: true } payload is enough.
========================================================= */

export function useReactivateQuotation() {
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
            "quotations",
          ],
        }
      );
    },
  });
}