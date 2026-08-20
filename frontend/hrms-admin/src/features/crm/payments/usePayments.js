import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

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
========================================================= */

export const useDeactivatePayment =
  () =>
    useCrudRemove(
      "payments",
      api
    );