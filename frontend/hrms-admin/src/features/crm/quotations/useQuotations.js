import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

const api =
  crmApi.quotations;

/* =========================================================
   LIST
========================================================= */

export const useQuotations = (
  params
) =>
  useCrudList(
    "quotations",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useQuotation = (
  id
) =>
  useCrudGet(
    "quotations",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateQuotation =
  () =>
    useCrudCreate(
      "quotations",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
========================================================= */

export const useDeactivateQuotation =
  () =>
    useCrudRemove(
      "quotations",
      api
    );