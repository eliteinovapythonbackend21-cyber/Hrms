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
  },

  /* =========================================================
     PAYMENTS
  ========================================================= */

  payments: {
    ...createCrudApi({
      listUrl: C.PAYMENTS,
      itemUrl: C.PAYMENTS_ITEM,
    }),

    /*
     * Explicit update method for Payments.
     *
     * PUT /payments/:id
     *
     * IMPORTANT: this was previously missing entirely (payments
     * was just the bare createCrudApi() output), which is why
     * Edit / Deactivate / Reactivate for payments never worked -
     * crmApi.payments.update / .deactivate were undefined.
     */
    update: (id, payload) =>
      axiosClient.put(
        C.PAYMENTS_ITEM(id),
        payload
      ),

    /*
     * Explicit soft-deactivate method.
     *
     * PUT /payments/:id
     * { is_active: false }
     */
    deactivate: (id) =>
      axiosClient.put(
        C.PAYMENTS_ITEM(id),
        {
          is_active: false,
        }
      ),

    /*
     * Explicit reactivate method.
     *
     * PUT /payments/:id
     * { is_active: true }
     */
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

  supportTickets:
    createCrudApi({
      listUrl:
        C.SUPPORT_TICKETS,
      itemUrl:
        C.SUPPORT_TICKETS_ITEM,
    }),
};