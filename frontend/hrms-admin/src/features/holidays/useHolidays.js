import { holidayApi } from "@/api/master.api";

import {
  useCrudList,
  useCrudCreate,
  useCrudUpdate,
  useCrudRemove,
} from "@/hooks/useCrudResource";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";


/* ============================================================
   HOLIDAY LIST
============================================================ */

export const useHolidays = (
  params
) =>
  useCrudList(
    "holidays",
    holidayApi,
    params
  );


/* ============================================================
   CREATE HOLIDAY
============================================================ */

export const useCreateHoliday = () =>
  useCrudCreate(
    "holidays",
    holidayApi
  );


/* ============================================================
   UPDATE HOLIDAY
============================================================ */

export const useUpdateHoliday = () =>
  useCrudUpdate(
    "holidays",
    holidayApi
  );


/* ============================================================
   DEACTIVATE HOLIDAY
============================================================ */

export const useDeactivateHoliday = () =>
  useCrudRemove(
    "holidays",
    holidayApi
  );


/* ============================================================
   GOVERNMENT HOLIDAY SYNC
============================================================ */

export function useSyncGovernmentHolidays() {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      year,
      countryCode,
    }) => {

      const response =
        await holidayApi.syncGovernmentHolidays(
          year,
          countryCode
        );

      return response.data;
    },


    onSuccess: async () => {

      await queryClient.invalidateQueries({
        queryKey: [
          "holidays",
        ],
      });

    },

  });
}


/* ============================================================
   GOVERNMENT HOLIDAY UNSYNC
============================================================ */

export function useUnsyncGovernmentHolidays() {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      year,
      countryCode,
    }) => {

      /*
       * The backend unsync endpoint is expected to be
       * exposed by holidayApi.unsyncGovernmentHolidays().
       */

      const response =
        await holidayApi.unsyncGovernmentHolidays(
          year,
          countryCode
        );

      return response.data;
    },


    onSuccess: async () => {

      await queryClient.invalidateQueries({
        queryKey: [
          "holidays",
        ],
      });

    },

  });
}


/* ============================================================
   OFFICE SUNDAY SYNC
============================================================ */

export function useSyncOfficeSundays() {

  const queryClient =
    useQueryClient();

  return useMutation({

    mutationFn: async ({
      startYear,
      endYear,
    }) => {

      const response =
        await holidayApi.syncOfficeSundays(
          startYear,
          endYear
        );

      return response.data;
    },


    onSuccess: async () => {

      await queryClient.invalidateQueries({
        queryKey: [
          "holidays",
        ],
      });

    },

  });
}


/* ============================================================
   GOVERNMENT HOLIDAY PREVIEW
============================================================ */

export function usePreviewGovernmentHolidays(
  year,
  countryCode,
  enabled = true
) {

  return useQuery({

    queryKey: [
      "holidays",
      "preview-government",
      year,
      countryCode,
    ],


    queryFn: async () => {

      const response =
        await holidayApi.previewGovernment(
          year,
          countryCode
        );

      return response.data;

    },


    enabled:
      enabled &&
      !!year &&
      !!countryCode,

  });
}