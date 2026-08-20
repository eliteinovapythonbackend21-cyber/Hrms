import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useFileDownload } from "@/hooks/useFileDownload";

const api =
  crmApi.invoices;

/* =========================================================
   LIST
========================================================= */

export const useInvoices = (
  params
) =>
  useCrudList(
    "invoices",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useInvoice = (
  id
) =>
  useCrudGet(
    "invoices",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateInvoice =
  () =>
    useCrudCreate(
      "invoices",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
   NOTE: hits the generic DELETE /invoices/:id route, which is
   intentionally blocked (deletable=False on invoices_bp) - kept
   here only for parity with the sibling files. Actual deactivation
   goes through PUT with { is_active: false }, same as leads,
   customers, follow-ups, meetings, and quotations.
========================================================= */

export const useDeactivateInvoice =
  () =>
    useCrudRemove(
      "invoices",
      api
    );

/* =========================================================
   UPDATE
========================================================= */

export function useUpdateInvoice() {
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
            "invoices",
          ],
        }
      );
    },
  });
}

/* =========================================================
   REACTIVATE
   Goes through the same PUT /invoices/:id route as edit - the
   generic CRUD update handler only sets fields present in the
   request body, so a partial { is_active: true } payload is enough.
========================================================= */

export function useReactivateInvoice() {
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
            "invoices",
          ],
        }
      );
    },
  });
}

/* =========================================================
   INVOICE REPORT
========================================================= */

export function useInvoiceReport() {
  const {
    downloadBlob,
  } = useFileDownload();

  return useMutation({
    mutationFn: async (
      params
    ) => {
      const res =
        await api.report(
          params
        );

      downloadBlob(
        res,
        "crm_report.xlsx"
      );

      return res;
    },
  });
}