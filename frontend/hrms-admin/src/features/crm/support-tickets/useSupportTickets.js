import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const api =
  crmApi.supportTickets;

/* =========================================================
   LIST
========================================================= */

export const useSupportTickets = (
  params
) =>
  useCrudList(
    "support-tickets",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useSupportTicket = (
  id
) =>
  useCrudGet(
    "support-tickets",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateSupportTicket =
  () =>
    useCrudCreate(
      "support-tickets",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
   NOTE: hits the generic DELETE /support-tickets/:id route, which
   is intentionally blocked (deletable=False on
   support_tickets_bp) - kept here only for parity with the sibling
   files. Actual deactivation goes through PUT with
   { is_active: false }, same as the rest of the CRM module.
========================================================= */

export const useDeactivateSupportTicket =
  () =>
    useCrudRemove(
      "support-tickets",
      api
    );

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateSupportTicket() {
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
            "support-tickets",
          ],
        }
      );
    },
  });
}

/* =========================================================
   REACTIVATE
   Goes through the same PUT /support-tickets/:id route as edit -
   the generic CRUD update handler only sets fields present in the
   request body, so a partial { is_active: true } payload is enough.
========================================================= */

export function useReactivateSupportTicket() {
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
            "support-tickets",
          ],
        }
      );
    },
  });
}