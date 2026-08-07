import axiosClient from "./axiosClient";
import { API } from "./endpoints";
import { createCrudApi } from "@/utils/crudFactory";

const C = API.CRM;

export const crmApi = {
  leads: {
    ...createCrudApi({ listUrl: C.LEADS, itemUrl: C.LEADS_ITEM }),
    convert: (id, payload) => axiosClient.post(C.LEAD_CONVERT(id), payload || {}),
  },
  customers: createCrudApi({ listUrl: C.CUSTOMERS, itemUrl: C.CUSTOMERS_ITEM }),
  followUps: createCrudApi({ listUrl: C.FOLLOW_UPS, itemUrl: C.FOLLOW_UPS_ITEM }),
  meetings: createCrudApi({ listUrl: C.MEETINGS, itemUrl: C.MEETINGS_ITEM }),
  quotations: createCrudApi({ listUrl: C.QUOTATIONS, itemUrl: C.QUOTATIONS_ITEM }),
  invoices: {
    ...createCrudApi({ listUrl: C.INVOICES, itemUrl: C.INVOICES_ITEM }),
    report: (params) => axiosClient.get(C.INVOICES_REPORT, { params, responseType: "blob" }),
  },
  payments: createCrudApi({ listUrl: C.PAYMENTS, itemUrl: C.PAYMENTS_ITEM }),
  supportTickets: createCrudApi({ listUrl: C.SUPPORT_TICKETS, itemUrl: C.SUPPORT_TICKETS_ITEM }),
};
