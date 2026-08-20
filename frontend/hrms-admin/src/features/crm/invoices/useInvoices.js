import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

import { useMutation } from "@tanstack/react-query";

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
========================================================= */

export const useDeactivateInvoice =
  () =>
    useCrudRemove(
      "invoices",
      api
    );

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