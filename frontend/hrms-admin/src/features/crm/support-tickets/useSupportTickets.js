import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

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
========================================================= */

export const useDeactivateSupportTicket =
  () =>
    useCrudRemove(
      "support-tickets",
      api
    );