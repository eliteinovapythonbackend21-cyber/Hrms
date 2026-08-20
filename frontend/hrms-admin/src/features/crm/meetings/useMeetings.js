import { crmApi } from "@/api/crm.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudRemove,
  useCrudGet,
} from "@/hooks/useCrudResource";

const api = crmApi.meetings;

/* =========================================================
   LIST
========================================================= */

export const useMeetings = (
  params
) =>
  useCrudList(
    "meetings",
    api,
    params
  );

/* =========================================================
   GET SINGLE
========================================================= */

export const useMeeting = (
  id
) =>
  useCrudGet(
    "meetings",
    api,
    id
  );

/* =========================================================
   CREATE
========================================================= */

export const useCreateMeeting =
  () =>
    useCrudCreate(
      "meetings",
      api
    );

/* =========================================================
   DEACTIVATE / REMOVE
========================================================= */

export const useDeactivateMeeting =
  () =>
    useCrudRemove(
      "meetings",
      api
    );