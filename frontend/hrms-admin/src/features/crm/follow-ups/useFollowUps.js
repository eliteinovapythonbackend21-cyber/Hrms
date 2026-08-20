import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

const api =
  crmApi.followUps;

/* =========================================================
   LIST
========================================================= */

export const useFollowUps = (
  params
) =>
  useCrudList(
    "follow-ups",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useFollowUp = (
  id
) =>
  useCrudGet(
    "follow-ups",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateFollowUp =
  () =>
    useCrudCreate(
      "follow-ups",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
========================================================= */

export const useDeactivateFollowUp =
  () =>
    useCrudRemove(
      "follow-ups",
      api
    );