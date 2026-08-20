import axiosClient from "./axiosClient";

import { API } from "./endpoints";

import { createCrudApi } from "@/utils/crudFactory";

const C = API.CRM;

export const crmApi = {
  /* =========================================================
     LEADS
  ========================================================= */

  leads: {
    ...createCrudApi({
      listUrl: C.LEADS,
      itemUrl: C.LEADS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.LEADS_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.LEADS_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.LEADS_ITEM(id),
        {
          is_active: true,
        }
      ),

    convert: (
      id,
      payload
    ) =>
      axiosClient.post(
        C.LEAD_CONVERT(id),
        payload || {}
      ),
  },

  /* =========================================================
     CUSTOMERS
  ========================================================= */

  customers: {
    ...createCrudApi({
      listUrl: C.CUSTOMERS,
      itemUrl: C.CUSTOMERS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.CUSTOMERS_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.CUSTOMERS_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.CUSTOMERS_ITEM(id),
        {
          is_active: true,
        }
      ),
  },

  /* =========================================================
     FOLLOW UPS
  ========================================================= */

  followUps: {
    ...createCrudApi({
      listUrl: C.FOLLOW_UPS,
      itemUrl: C.FOLLOW_UPS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.FOLLOW_UPS_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.FOLLOW_UPS_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.FOLLOW_UPS_ITEM(id),
        {
          is_active: true,
        }
      ),
  },

  /* =========================================================
     MEETINGS
  ========================================================= */

  meetings: {
    ...createCrudApi({
      listUrl: C.MEETINGS,
      itemUrl: C.MEETINGS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.MEETINGS_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.MEETINGS_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.MEETINGS_ITEM(id),
        {
          is_active: true,
        }
      ),
  },

  /* =========================================================
     QUOTATIONS
  ========================================================= */

  quotations: {
    ...createCrudApi({
      listUrl: C.QUOTATIONS,
      itemUrl: C.QUOTATIONS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.QUOTATIONS_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.QUOTATIONS_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.QUOTATIONS_ITEM(id),
        {
          is_active: true,
        }
      ),
  },

  /* =========================================================
     INVOICES
  ========================================================= */

  invoices: {
    ...createCrudApi({
      listUrl: C.INVOICES,
      itemUrl: C.INVOICES_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.INVOICES_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.INVOICES_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.INVOICES_ITEM(id),
        {
          is_active: true,
        }
      ),

    /*
     * Aggregate multi-invoice CRM report (date-range).
     */
    report: (
      params
    ) =>
      axiosClient.get(
        C.INVOICES_REPORT,
        {
          params,
          responseType: "blob",
        }
      ),

    /*
     * NEW: per-invoice single-record download.
     *
     * GET /invoices/:id/download
     *
     * Distinct from `report` above - this downloads one invoice's
     * details as a file, used by the Download action on
     * InvoiceListPage.jsx (card, table, and details hover panel).
     */
    download: (id) =>
      axiosClient.get(
        C.INVOICES_DOWNLOAD(id),
        {
          responseType: "blob",
        }
      ),
  },

  /* =========================================================
     PAYMENTS
  ========================================================= */

  payments: {
    ...createCrudApi({
      listUrl: C.PAYMENTS,
      itemUrl: C.PAYMENTS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.PAYMENTS_ITEM(id),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.PAYMENTS_ITEM(id),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.PAYMENTS_ITEM(id),
        {
          is_active: true,
        }
      ),
  },

  /* =========================================================
     SUPPORT TICKETS
  ========================================================= */

  supportTickets: {
    ...createCrudApi({
      listUrl:
        C.SUPPORT_TICKETS,
      itemUrl:
        C.SUPPORT_TICKETS_ITEM,
    }),

    update: (id, payload) =>
      axiosClient.put(
        C.SUPPORT_TICKETS_ITEM(
          id
        ),
        payload
      ),

    deactivate: (id) =>
      axiosClient.put(
        C.SUPPORT_TICKETS_ITEM(
          id
        ),
        {
          is_active: false,
        }
      ),

    reactivate: (id) =>
      axiosClient.put(
        C.SUPPORT_TICKETS_ITEM(
          id
        ),
        {
          is_active: true,
        }
      ),
  },
};