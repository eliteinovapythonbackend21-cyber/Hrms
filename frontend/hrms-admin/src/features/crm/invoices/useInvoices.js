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
   goes through PUT with { is_active: false }, same as the rest of
   the CRM module.
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
   Aggregate multi-invoice CRM report across a date range.
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

/* =========================================================
   SINGLE INVOICE DOWNLOAD
   Downloads a single invoice's details as a file - used by the
   per-card / per-row "Download" action on InvoiceListPage.jsx.
   Distinct from useInvoiceReport() above, which covers a
   multi-invoice date-range export.
========================================================= */

export function useDownloadInvoice() {
  const {
    downloadBlob,
  } = useFileDownload();

  return useMutation({
    mutationFn: async (
      invoiceOrId
    ) => {
      const id =
        invoiceOrId?.id ??
        invoiceOrId;

      const res =
        await api.download(
          id
        );

      const filename =
        invoiceOrId?.invoice_number
          ? `invoice_${invoiceOrId.invoice_number}.xlsx`
          : `invoice_${id}.xlsx`;

      downloadBlob(
        res,
        filename
      );

      return res;
    },
  });
}