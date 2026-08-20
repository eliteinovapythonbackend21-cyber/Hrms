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

    /*
     * Explicit update method for Leads.
     *
     * PUT /leads/:id
     */
    update: (id, payload) =>
      axiosClient.put(
        C.LEADS_ITEM(id),
        payload
      ),

    /*
     * Explicit soft-deactivate method.
     *
     * PUT /leads/:id
     * { is_active: false }
     */
    deactivate: (id) =>
      axiosClient.put(
        C.LEADS_ITEM(id),
        {
          is_active: false,
        }
      ),

    /*
     * Explicit reactivate method.
     *
     * PUT /leads/:id
     * { is_active: true }
     */
    reactivate: (id) =>
      axiosClient.put(
        C.LEADS_ITEM(id),
        {
          is_active: true,
        }
      ),

    /*
     * Convert Lead → Customer.
     */
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

    /*
     * Explicit update method for Customers.
     *
     * PUT /customers/:id
     *
     * NOTE: this mirrors leads.update() above. createCrudApi()
     * already spreads in first, so this override takes
     * precedence - added explicitly (rather than relying on
     * whatever the factory's default update does) for the same
     * reason leads has one: CustomerListPage.jsx calls
     * crmApi.customers.update(id, payload) directly for Edit.
     */
    update: (id, payload) =>
      axiosClient.put(
        C.CUSTOMERS_ITEM(id),
        payload
      ),

    /*
     * Explicit soft-deactivate method.
     *
     * PUT /customers/:id
     * { is_active: false }
     *
     * IMPORTANT: this was previously missing entirely, which is
     * why Deactivate for customers never worked -
     * crmApi.customers.deactivate was undefined.
     */
    deactivate: (id) =>
      axiosClient.put(
        C.CUSTOMERS_ITEM(id),
        {
          is_active: false,
        }
      ),

    /*
     * Explicit reactivate method.
     *
     * PUT /customers/:id
     * { is_active: true }
     */
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

  followUps:
    createCrudApi({
      listUrl: C.FOLLOW_UPS,
      itemUrl: C.FOLLOW_UPS_ITEM,
    }),

  /* =========================================================
     MEETINGS
  ========================================================= */

  meetings:
    createCrudApi({
      listUrl: C.MEETINGS,
      itemUrl: C.MEETINGS_ITEM,
    }),

  /* =========================================================
     QUOTATIONS
  ========================================================= */

  quotations:
    createCrudApi({
      listUrl: C.QUOTATIONS,
      itemUrl: C.QUOTATIONS_ITEM,
    }),

  /* =========================================================
     INVOICES
  ========================================================= */

  invoices: {
    ...createCrudApi({
      listUrl: C.INVOICES,
      itemUrl: C.INVOICES_ITEM,
    }),

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

  payments:
    createCrudApi({
      listUrl: C.PAYMENTS,
      itemUrl: C.PAYMENTS_ITEM,
    }),

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