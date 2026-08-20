import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

const api =
  crmApi.payments;

/* =========================================================
   LIST
========================================================= */

export const usePayments = (
  params
) =>
  useCrudList(
    "payments",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const usePayment = (
  id
) =>
  useCrudGet(
    "payments",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreatePayment =
  () =>
    useCrudCreate(
      "payments",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
   NOTE: hits the generic DELETE /payments/:id route, which is
   intentionally blocked (deletable=False on payments_bp) - kept
   here only for parity with the sibling files. Actual deactivation
   goes through PUT with { is_active: false }, same as the rest of
   the CRM module.
========================================================= */

export const useDeactivatePayment =
  () =>
    useCrudRemove(
      "payments",
      api
    );

/* =========================================================
   UPDATE
========================================================= */

export function useUpdatePayment() {
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
            "payments",
          ],
        }
      );

      // Editing a payment amount can change whether its invoice
      // qualifies as "Paid" - invalidate invoices too so stale
      // status doesn't linger in the UI. NOTE: the backend does
      // NOT currently recompute invoice.status on payment update
      // (only on create, via _flip_invoice_status) - this only
      // refreshes cached data, it doesn't fix the underlying value.
      queryClient.invalidateQueries(
        {
          queryKey: [
            "invoices",
          ],
        }
      );
    },
  });
}

/* =========================================================
   REACTIVATE
   Goes through the same PUT /payments/:id route as edit - the
   generic CRUD update handler only sets fields present in the
   request body, so a partial { is_active: true } payload is enough.
========================================================= */

export function useReactivatePayment() {
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
            "payments",
          ],
        }
      );
    },
  });
}